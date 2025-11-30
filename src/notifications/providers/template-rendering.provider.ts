import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateRenderingProvider {
  private readonly logger = new Logger(TemplateRenderingProvider.name);

  constructor() {
    // Register custom Handlebars helpers
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Helper for formatting dates
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      if (!date) return '';
      const d = new Date(date);

      if (format === 'short') {
        return d.toLocaleDateString();
      } else if (format === 'long') {
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else if (format === 'time') {
        return d.toLocaleTimeString();
      }

      return d.toLocaleString();
    });

    // Helper for formatting currency
    Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'USD') => {
      if (amount === null || amount === undefined) return '';

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Helper for conditional logic
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

    // Helper for uppercase
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    // Helper for lowercase
    Handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });
  }

  render(template: string, data: Record<string, any>): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    } catch (error) {
      this.logger.error('Template rendering failed:', error);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  renderWithSubject(
    subjectTemplate: string | null,
    bodyTemplate: string,
    data: Record<string, any>,
  ): { subject: string; body: string } {
    try {
      const subject = subjectTemplate ? this.render(subjectTemplate, data) : '';
      const body = this.render(bodyTemplate, data);

      return { subject, body };
    } catch (error) {
      this.logger.error('Template rendering with subject failed:', error);
      throw error;
    }
  }

  validateTemplate(template: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(template);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  extractPlaceholders(template: string): string[] {
    const placeholders = new Set<string>();
    const regex = /\{\{([^{}]+)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      // Extract the variable name, removing helpers and whitespace
      const placeholder = match[1].trim().split(' ')[0];
      placeholders.add(placeholder);
    }

    return Array.from(placeholders);
  }
}
