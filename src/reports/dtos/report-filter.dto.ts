import { IsOptional, IsDateString, IsEnum } from 'class-validator';

/**
 * Date range presets for quick filtering
 */
export enum DateRangePreset {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
}

/**
 * Base DTO for report date filtering
 */
export class ReportFilterDto {
  @IsOptional()
  @IsEnum(DateRangePreset)
  dateRange?: DateRangePreset;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * Helper method to get actual date range
   */
  getDateRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (this.dateRange && this.dateRange !== DateRangePreset.CUSTOM) {
      switch (this.dateRange) {
        case DateRangePreset.TODAY:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;

        case DateRangePreset.YESTERDAY:
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.setHours(0, 0, 0, 0));
          endDate = new Date(yesterday.setHours(23, 59, 59, 999));
          break;

        case DateRangePreset.LAST_7_DAYS:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;

        case DateRangePreset.LAST_30_DAYS:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;

        case DateRangePreset.THIS_MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;

        case DateRangePreset.LAST_MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;

        case DateRangePreset.THIS_YEAR:
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;

        case DateRangePreset.LAST_YEAR:
          startDate = new Date(now.getFullYear() - 1, 0, 1);
          endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;

        default:
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
      }
    } else {
      startDate = this.startDate ? new Date(this.startDate) : new Date(now.setDate(now.getDate() - 30));
      endDate = this.endDate ? new Date(this.endDate) : new Date();
    }

    return { startDate, endDate };
  }
}
