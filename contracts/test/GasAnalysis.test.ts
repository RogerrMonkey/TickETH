import { expect } from "chai";
import { ethers } from "hardhat";
import { TickETHTicket, TickETHFactory, TickETHMarketplace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import * as fs from "fs";
import * as path from "path";

const ZERO_BYTES32 = ethers.ZeroHash;
const PLATFORM_FEE_BPS = 250; // 2.5%

/**
 * Gas Cost Analysis: Polygon (PoS) vs Ethereum Mainnet
 *
 * Measures actual gas units consumed by each TickETH operation,
 * then calculates USD cost at typical gas prices for both networks.
 *
 * Assumptions (March 2026 market):
 *   - ETH price:  ~$2,200
 *   - POL price:  ~$0.25
 *   - Ethereum avg gas price: ~25 gwei
 *   - Polygon avg gas price:  ~30 gwei  (but in POL, which is 8,800x cheaper)
 */
describe("Gas Cost Analysis — Polygon vs Ethereum", function () {
  let implementation: TickETHTicket;
  let factory: TickETHFactory;
  let marketplace: TickETHMarketplace;
  let admin: SignerWithAddress;
  let organizer: SignerWithAddress;
  let buyer1: SignerWithAddress;
  let buyer2: SignerWithAddress;
  let treasury: SignerWithAddress;

  // Gas measurements
  const gasResults: { operation: string; gasUsed: bigint }[] = [];

  before(async function () {
    [admin, organizer, buyer1, buyer2, treasury] = await ethers.getSigners();

    // Deploy implementation
    const TickETHTicketFactory = await ethers.getContractFactory("TickETHTicket");
    implementation = await TickETHTicketFactory.deploy();
    await implementation.waitForDeployment();

    // Deploy factory
    const TickETHFactoryFactory = await ethers.getContractFactory("TickETHFactory");
    factory = await TickETHFactoryFactory.deploy(
      await implementation.getAddress(),
      PLATFORM_FEE_BPS,
      treasury.address
    );
    await factory.waitForDeployment();

    // Deploy marketplace
    const MarketplaceFactory = await ethers.getContractFactory("TickETHMarketplace");
    marketplace = await MarketplaceFactory.deploy();
    await marketplace.waitForDeployment();
  });

  // ── Helper ──
  async function measureGas(operation: string, txPromise: Promise<any>): Promise<bigint> {
    const tx = await txPromise;
    const receipt = await tx.wait();
    const gas = receipt!.gasUsed;
    gasResults.push({ operation, gasUsed: gas });
    console.log(`    ⛽  ${operation}: ${gas.toLocaleString()} gas`);
    return gas;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Measure each operation
  // ═══════════════════════════════════════════════════════════════

  it("Factory: Deploy Implementation", async function () {
    const F = await ethers.getContractFactory("TickETHTicket");
    const impl = await F.deploy();
    const receipt = await impl.deploymentTransaction()!.wait();
    gasResults.push({ operation: "Deploy Implementation", gasUsed: receipt!.gasUsed });
    console.log(`    ⛽  Deploy Implementation: ${receipt!.gasUsed.toLocaleString()} gas`);
  });

  it("Factory: Deploy Factory", async function () {
    const F = await ethers.getContractFactory("TickETHFactory");
    const f = await F.deploy(
      await implementation.getAddress(),
      PLATFORM_FEE_BPS,
      treasury.address
    );
    const receipt = await f.deploymentTransaction()!.wait();
    gasResults.push({ operation: "Deploy Factory", gasUsed: receipt!.gasUsed });
    console.log(`    ⛽  Deploy Factory: ${receipt!.gasUsed.toLocaleString()} gas`);
  });

  it("Factory: Deploy Marketplace", async function () {
    const F = await ethers.getContractFactory("TickETHMarketplace");
    const m = await F.deploy();
    const receipt = await m.deploymentTransaction()!.wait();
    gasResults.push({ operation: "Deploy Marketplace", gasUsed: receipt!.gasUsed });
    console.log(`    ⛽  Deploy Marketplace: ${receipt!.gasUsed.toLocaleString()} gas`);
  });

  let eventContract: TickETHTicket;

  it("Create Event (Clone)", async function () {
    const futureTime = Math.floor(Date.now() / 1000) + 86400 * 30;
    await measureGas(
      "Create Event (Clone)",
      factory.connect(organizer).createEvent("Test Event", "TST", "ipfs://base/", futureTime)
    );

    const events = await factory.getOrganizerEvents(organizer.address);
    eventContract = await ethers.getContractAt("TickETHTicket", events[0]);
  });

  it("Add Tier", async function () {
    await measureGas(
      "Add Tier",
      eventContract.connect(organizer).addTier(
        "General Admission",
        ethers.parseEther("0.01"),
        100,
        0, 0, 5,
        ZERO_BYTES32,
        3,
        2000
      )
    );
  });

  it("Mint Ticket", async function () {
    await measureGas(
      "Mint Ticket",
      eventContract.connect(buyer1).mint(0, [], { value: ethers.parseEther("0.01") })
    );
  });

  it("Mint 2nd Ticket (same tier)", async function () {
    await measureGas(
      "Mint 2nd Ticket",
      eventContract.connect(buyer1).mint(0, [], { value: ethers.parseEther("0.01") })
    );
  });

  it("Check-In Ticket", async function () {
    await measureGas(
      "Check-In",
      eventContract.connect(organizer).checkIn(1)
    );
  });

  it("Set Approved Marketplace", async function () {
    await measureGas(
      "Set Marketplace",
      eventContract.connect(organizer).setApprovedMarketplace(await marketplace.getAddress())
    );
    // Also register the contract on marketplace
    await marketplace.connect(admin).setAllowedContract(await eventContract.getAddress(), true);
  });

  it("Approve Marketplace (ERC-721)", async function () {
    await measureGas(
      "Approve (ERC-721)",
      eventContract.connect(buyer1).approve(await marketplace.getAddress(), 2)
    );
  });

  it("List Ticket (Marketplace)", async function () {
    await measureGas(
      "List Ticket",
      marketplace.connect(buyer1).listTicket(
        await eventContract.getAddress(),
        2,
        ethers.parseEther("0.012")
      )
    );
  });

  it("Buy Ticket (Marketplace)", async function () {
    await measureGas(
      "Buy Ticket (Resale)",
      marketplace.connect(buyer2).buyTicket(0, { value: ethers.parseEther("0.012") })
    );
  });

  it("Transfer Ticket (Direct)", async function () {
    // Mint ticket 3 for buyer1 then transfer
    await eventContract.connect(buyer1).mint(0, [], { value: ethers.parseEther("0.01") });
    await measureGas(
      "Transfer Ticket",
      eventContract.connect(buyer1).transferFrom(buyer1.address, buyer2.address, 3)
    );
  });

  it("Withdraw Funds", async function () {
    await measureGas(
      "Withdraw Funds",
      eventContract.connect(organizer).withdraw()
    );
  });

  // ═══════════════════════════════════════════════════════════════
  //  Generate Comparison Report & Chart
  // ═══════════════════════════════════════════════════════════════

  after(function () {
    // ── Price assumptions ──
    const ETH_PRICE_USD = 2200;
    const POL_PRICE_USD = 0.25;
    const ETH_GAS_PRICE_GWEI = 25;
    const POLYGON_GAS_PRICE_GWEI = 30;

    const gweiToEth = (gasUsed: bigint, gasPriceGwei: number): number =>
      Number(gasUsed) * gasPriceGwei * 1e-9;

    // ── Skip one-time deployments for the operational comparison ──
    const deploymentOps = new Set([
      "Deploy Implementation",
      "Deploy Factory",
      "Deploy Marketplace",
    ]);

    const operationalResults = gasResults.filter(r => !deploymentOps.has(r.operation));
    const deploymentResults = gasResults.filter(r => deploymentOps.has(r.operation));

    // ── Build comparison data ──
    interface Row {
      operation: string;
      gasUsed: number;
      ethCostUSD: number;
      polygonCostUSD: number;
      savings: string;
    }

    const rows: Row[] = gasResults.map(r => {
      const gas = Number(r.gasUsed);
      const ethCost = gweiToEth(r.gasUsed, ETH_GAS_PRICE_GWEI) * ETH_PRICE_USD;
      const polCost = gweiToEth(r.gasUsed, POLYGON_GAS_PRICE_GWEI) * POL_PRICE_USD;
      const savingsPercent = ((1 - polCost / ethCost) * 100).toFixed(2);
      return {
        operation: r.operation,
        gasUsed: gas,
        ethCostUSD: ethCost,
        polygonCostUSD: polCost,
        savings: `${savingsPercent}%`,
      };
    });

    // ── Console table ──
    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║              TickETH Gas Cost Analysis — Polygon vs Ethereum                    ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");
    console.log(`║  ETH Price: $${ETH_PRICE_USD}  |  POL Price: $${POL_PRICE_USD}  |  ETH Gas: ${ETH_GAS_PRICE_GWEI} gwei  |  Polygon Gas: ${POLYGON_GAS_PRICE_GWEI} gwei  ║`);
    console.log("╠══════════════════════════════════════════════════════════════════════════════════╣");

    const header = `║ ${"Operation".padEnd(25)} │ ${"Gas Used".padStart(12)} │ ${"ETH Cost".padStart(12)} │ ${"Polygon Cost".padStart(12)} │ ${"Savings".padStart(10)} ║`;
    console.log(header);
    console.log("╠═════════════════════════╪══════════════╪══════════════╪══════════════╪════════════╣");

    for (const row of rows) {
      const line = `║ ${row.operation.padEnd(25)} │ ${row.gasUsed.toLocaleString().padStart(12)} │ $${row.ethCostUSD.toFixed(4).padStart(11)} │ $${row.polygonCostUSD.toFixed(6).padStart(11)} │ ${row.savings.padStart(10)} ║`;
      console.log(line);
    }

    // ── Totals ──
    const totalGas = rows.reduce((s, r) => s + r.gasUsed, 0);
    const totalEth = rows.reduce((s, r) => s + r.ethCostUSD, 0);
    const totalPol = rows.reduce((s, r) => s + r.polygonCostUSD, 0);
    const totalSavings = ((1 - totalPol / totalEth) * 100).toFixed(2);

    console.log("╠═════════════════════════╪══════════════╪══════════════╪══════════════╪════════════╣");
    console.log(`║ ${"TOTAL".padEnd(25)} │ ${totalGas.toLocaleString().padStart(12)} │ $${totalEth.toFixed(4).padStart(11)} │ $${totalPol.toFixed(6).padStart(11)} │ ${(totalSavings + "%").padStart(10)} ║`);
    console.log("╚═════════════════════════╧══════════════╧══════════════╧══════════════╧════════════╝");

    // ── Generate HTML chart ──
    const opLabels = operationalResults.map(r => r.operation);
    const ethCosts = operationalResults.map(r => gweiToEth(r.gasUsed, ETH_GAS_PRICE_GWEI) * ETH_PRICE_USD);
    const polCosts = operationalResults.map(r => gweiToEth(r.gasUsed, POLYGON_GAS_PRICE_GWEI) * POL_PRICE_USD);
    const gasValues = operationalResults.map(r => Number(r.gasUsed));

    // Deployment costs
    const deplLabels = deploymentResults.map(r => r.operation);
    const deplEthCosts = deploymentResults.map(r => gweiToEth(r.gasUsed, ETH_GAS_PRICE_GWEI) * ETH_PRICE_USD);
    const deplPolCosts = deploymentResults.map(r => gweiToEth(r.gasUsed, POLYGON_GAS_PRICE_GWEI) * POL_PRICE_USD);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TickETH Gas Cost Analysis</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0a0a0f;
      color: #e4e4e7;
      padding: 2rem;
    }
    h1 {
      text-align: center;
      font-size: 2rem;
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      text-align: center;
      color: #71717a;
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      max-width: 1400px;
      margin: 0 auto 2rem;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .card.full { grid-column: 1 / -1; }
    .card h2 {
      font-size: 1.1rem;
      color: #a1a1aa;
      margin-bottom: 1rem;
    }
    canvas { width: 100% !important; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
      max-width: 1400px;
      margin: 0 auto 2rem;
    }
    .stat-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
    }
    .stat-card .label { color: #71717a; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .stat-card .value { font-size: 1.5rem; font-weight: 700; }
    .stat-card .value.green { color: #22c55e; }
    .stat-card .value.purple { color: #7c3aed; }
    .stat-card .value.blue { color: #3b82f6; }
    .stat-card .value.amber { color: #f59e0b; }
    .assumptions {
      max-width: 1400px;
      margin: 0 auto;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      color: #71717a;
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .assumptions strong { color: #a1a1aa; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #27272a; }
    th { color: #71717a; font-weight: 500; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr:hover { background: #1f1f23; }
    .savings { color: #22c55e; font-weight: 600; }
  </style>
</head>
<body>
  <h1>TickETH Gas Cost Analysis</h1>
  <p class="subtitle">Polygon (PoS) vs Ethereum Mainnet — All TickETH Smart Contract Operations</p>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="label">Avg Cost Savings</div>
      <div class="value green">${totalSavings}%</div>
    </div>
    <div class="stat-card">
      <div class="label">Mint Cost (Polygon)</div>
      <div class="value purple">$${polCosts.find((_, i) => opLabels[i] === "Mint Ticket")?.toFixed(6) ?? "—"}</div>
    </div>
    <div class="stat-card">
      <div class="label">Mint Cost (Ethereum)</div>
      <div class="value blue">$${ethCosts.find((_, i) => opLabels[i] === "Mint Ticket")?.toFixed(4) ?? "—"}</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Ops Measured</div>
      <div class="value amber">${gasResults.length}</div>
    </div>
  </div>

  <div class="grid">
    <!-- Chart 1: Operational Costs Bar Chart -->
    <div class="card full">
      <h2>Operational Costs — USD per Transaction</h2>
      <canvas id="costChart" height="100"></canvas>
    </div>

    <!-- Chart 2: Gas Units -->
    <div class="card">
      <h2>Gas Units per Operation</h2>
      <canvas id="gasChart" height="200"></canvas>
    </div>

    <!-- Chart 3: Deployment Costs -->
    <div class="card">
      <h2>One-Time Deployment Costs (USD)</h2>
      <canvas id="deployChart" height="200"></canvas>
    </div>

    <!-- Table -->
    <div class="card full">
      <h2>Detailed Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Operation</th>
            <th style="text-align:right">Gas Used</th>
            <th style="text-align:right">Ethereum Cost</th>
            <th style="text-align:right">Polygon Cost</th>
            <th style="text-align:right">Savings</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
          <tr>
            <td>${r.operation}</td>
            <td class="num">${r.gasUsed.toLocaleString()}</td>
            <td class="num">$${r.ethCostUSD.toFixed(4)}</td>
            <td class="num">$${r.polygonCostUSD.toFixed(6)}</td>
            <td class="num savings">${r.savings}</td>
          </tr>`).join("")}
          <tr style="font-weight:700; border-top: 2px solid #3f3f46;">
            <td>TOTAL</td>
            <td class="num">${totalGas.toLocaleString()}</td>
            <td class="num">$${totalEth.toFixed(4)}</td>
            <td class="num">$${totalPol.toFixed(6)}</td>
            <td class="num savings">${totalSavings}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="assumptions">
    <strong>Assumptions:</strong>
    ETH Price = $${ETH_PRICE_USD} | POL Price = $${POL_PRICE_USD} |
    Ethereum Gas Price = ${ETH_GAS_PRICE_GWEI} gwei | Polygon Gas Price = ${POLYGON_GAS_PRICE_GWEI} gwei |
    Gas units are identical on both networks (same EVM bytecode). The cost difference comes entirely from
    the native token price (ETH vs POL) and typical gas prices on each network.
  </div>

  <script>
    const labels = ${JSON.stringify(opLabels)};
    const ethData = ${JSON.stringify(ethCosts)};
    const polData = ${JSON.stringify(polCosts)};
    const gasData = ${JSON.stringify(gasValues)};
    const deplLabels = ${JSON.stringify(deplLabels)};
    const deplEth = ${JSON.stringify(deplEthCosts)};
    const deplPol = ${JSON.stringify(deplPolCosts)};

    const commonOptions = {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#a1a1aa', font: { size: 12 } } },
      },
      scales: {
        x: { ticks: { color: '#71717a', font: { size: 11 } }, grid: { color: '#27272a' } },
        y: { ticks: { color: '#71717a' }, grid: { color: '#27272a' } },
      },
    };

    // Chart 1: Cost comparison (log scale to show both)
    new Chart(document.getElementById('costChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ethereum (USD)',
            data: ethData,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          },
          {
            label: 'Polygon (USD)',
            data: polData,
            backgroundColor: '#7c3aed',
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            type: 'logarithmic',
            title: { display: true, text: 'Cost (USD) — Log Scale', color: '#71717a' },
          },
        },
      },
    });

    // Chart 2: Gas units
    new Chart(document.getElementById('gasChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Gas Units',
          data: gasData,
          backgroundColor: labels.map((_, i) => {
            const colors = ['#7c3aed','#3b82f6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#14b8a6','#f97316'];
            return colors[i % colors.length];
          }),
          borderRadius: 4,
        }],
      },
      options: {
        ...commonOptions,
        indexAxis: 'y',
        plugins: { ...commonOptions.plugins, legend: { display: false } },
        scales: {
          x: { ...commonOptions.scales.x, title: { display: true, text: 'Gas Units', color: '#71717a' } },
          y: { ...commonOptions.scales.y, ticks: { color: '#a1a1aa', font: { size: 11 } } },
        },
      },
    });

    // Chart 3: Deployment costs
    new Chart(document.getElementById('deployChart'), {
      type: 'bar',
      data: {
        labels: deplLabels,
        datasets: [
          { label: 'Ethereum (USD)', data: deplEth, backgroundColor: '#3b82f6', borderRadius: 4 },
          { label: 'Polygon (USD)', data: deplPol, backgroundColor: '#7c3aed', borderRadius: 4 },
        ],
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: { ...commonOptions.scales.y, title: { display: true, text: 'Cost (USD)', color: '#71717a' } },
        },
      },
    });
  </script>
</body>
</html>`;

    const outDir = path.resolve(__dirname, "..");
    const outPath = path.join(outDir, "gas-analysis.html");
    fs.writeFileSync(outPath, html, "utf-8");
    console.log(`\n  📊  Chart saved to: ${outPath}`);
    console.log(`      Open in browser to view interactive graphs.\n`);
  });
});
