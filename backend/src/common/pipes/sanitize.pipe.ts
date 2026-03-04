import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';

/**
 * Global pipe that sanitizes all string inputs by stripping HTML tags
 * and dangerous characters. Prevents XSS attacks in stored data.
 *
 * Applied globally alongside ValidationPipe.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Only sanitize body/query/param strings, not internal metadata
    if (metadata.type === 'custom') return value;
    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitize(val);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(input: string): string {
    return input
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove script-injection patterns
      .replace(/javascript\s*:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Remove null bytes
      .replace(/\0/g, '')
      // Trim excessive whitespace
      .trim();
  }
}
