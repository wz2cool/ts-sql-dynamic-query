import { ObjectUtils } from "ts-commons";
import { FilterOperator } from "ts-dynamic-query";
import { ColumnInfo, SqlTemplate } from "../model";

export class FilterHelper {
  public static getFilterExpression(operator: FilterOperator, columnInfo: ColumnInfo, filterValue: any): SqlTemplate {
    const filterValues = FilterHelper.getFilterValues(operator, filterValue);
    switch (operator) {
      case FilterOperator.NOT_EQUAL:
        return FilterHelper.getNotEqualExpression(columnInfo, filterValues);
      case FilterOperator.LESS_THAN:
        return FilterHelper.getLessThanExpression(columnInfo, filterValues);
      case FilterOperator.LESS_THAN_OR_EQUAL:
        return FilterHelper.getLessThanOrEqualExpression(columnInfo, filterValues);
      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return FilterHelper.getGreaterThanOrEqualExpression(columnInfo, filterValues);
      case FilterOperator.GREATER_THAN:
        return FilterHelper.getGreaterThanExpression(columnInfo, filterValues);
      case FilterOperator.START_WITH:
      case FilterOperator.END_WITH:
      case FilterOperator.CONTAINS:
        return FilterHelper.getLikeExpression(columnInfo, filterValues);
      case FilterOperator.IN:
        return FilterHelper.getInExpression(columnInfo, filterValues);
      case FilterOperator.NOT_IN:
        return FilterHelper.getNotInExpression(columnInfo, filterValues);
      case FilterOperator.BETWEEN:
        return FilterHelper.getBetweenExpression(columnInfo, filterValues);
      case FilterOperator.BITWISE_ANY:
        return FilterHelper.getBitwiseAnyExpression(columnInfo, filterValues);
      case FilterOperator.BITWISE_ZERO:
        return FilterHelper.getBitwiseZeroExpression(columnInfo, filterValues);
      case FilterOperator.BITWISE_ALL:
        return FilterHelper.getBitwiseAllExpression(columnInfo, filterValues);
      default:
        return FilterHelper.getEqualExpression(columnInfo, filterValues);
    }
  }

  private static getFilterValues(operator: FilterOperator, filterValue: any): any[] {
    let result: any[] = [];
    if (operator === FilterOperator.IN || operator === FilterOperator.NOT_IN || operator === FilterOperator.BETWEEN) {
      if (ObjectUtils.isArray(filterValue)) {
        result = filterValue as any[];
        if (operator === FilterOperator.BETWEEN && result.length !== 2) {
          const errMsg = 'if "BETWEEN" operator, the count of filter value must be 2';
          throw new TypeError(errMsg);
        }
      } else {
        const errMsg = 'filter value of "IN" or "NOT_IN" operator must be array';
        throw new TypeError(errMsg);
      }
    } else {
      if (ObjectUtils.isArray(filterValue)) {
        const errMsg = 'if not "BETWEEN", "IN" or "NOT_IN" operator, ' + "filter value can not be array or collection.";
        throw new TypeError(errMsg);
      }

      if (ObjectUtils.isNullOrUndefined(filterValue)) {
        result.push(null);
      } else {
        const processedFilterValue = FilterHelper.processSingleFilterValue(operator, filterValue);
        result.push(processedFilterValue);
      }
    }
    return result;
  }

  private static processSingleFilterValue(operator: FilterOperator, filterValue: any): any {
    if (operator === FilterOperator.START_WITH) {
      return (ObjectUtils.isNullOrUndefined(filterValue) ? "" : filterValue) + "%";
    } else if (operator === FilterOperator.END_WITH) {
      return "%" + (ObjectUtils.isNullOrUndefined(filterValue) ? "" : filterValue);
    } else if (operator === FilterOperator.CONTAINS) {
      return "%" + (ObjectUtils.isNullOrUndefined(filterValue) ? "" : filterValue) + "%";
    } else {
      return ObjectUtils.isNullOrUndefined(filterValue) ? null : filterValue;
    }
  }

  private static getEqualExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    const filterValue = filterValues[0];
    if (ObjectUtils.isNullOrUndefined(filterValue)) {
      sqlParam.sqlExpression = columnInfo.getQueryColumn() + " IS NULL";
    } else {
      sqlParam.sqlExpression = columnInfo.getQueryColumn() + " = ?";
      sqlParam.params = sqlParam.params.concat(filterValues);
    }
    return sqlParam;
  }

  private static getNotEqualExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    const filterValue = filterValues[0];
    if (ObjectUtils.isNullOrUndefined(filterValue)) {
      sqlParam.sqlExpression = columnInfo.getQueryColumn() + " IS NOT NULL";
    } else {
      sqlParam.sqlExpression = columnInfo.getQueryColumn() + " <> ?";
      sqlParam.params = sqlParam.params.concat(filterValues);
    }
    return sqlParam;
  }

  private static getLessThanExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = columnInfo.getQueryColumn() + " < ?";
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getLessThanOrEqualExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = columnInfo.getQueryColumn() + " <= ?";
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getGreaterThanOrEqualExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = columnInfo.getQueryColumn() + " >= ?";
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getGreaterThanExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = columnInfo.getQueryColumn() + " > ?";
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getLikeExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = columnInfo.getQueryColumn() + " LIKE ?";
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getInExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    if (filterValues.length > 0) {
      const placeholderStr = filterValues.map(f => "?").join(", ");
      sqlParam.sqlExpression = columnInfo.getQueryColumn() + ` IN (${placeholderStr})`;
      sqlParam.params = sqlParam.params.concat(filterValues);
    }
    return sqlParam;
  }

  private static getNotInExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    if (filterValues.length > 0) {
      const placeholderStr = filterValues.map(f => "?").join(", ");
      sqlParam.sqlExpression = columnInfo.getQueryColumn() + ` NOT IN (${placeholderStr})`;
      sqlParam.params = sqlParam.params.concat(filterValues);
    }
    return sqlParam;
  }

  private static getBetweenExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = columnInfo.getQueryColumn() + ` BETWEEN ? AND ?`;
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getBitwiseAnyExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = `${columnInfo.getQueryColumn()} & ? > 0`;
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getBitwiseZeroExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = `${columnInfo.getQueryColumn()} & ? = 0`;
    sqlParam.params = sqlParam.params.concat(filterValues);
    return sqlParam;
  }

  private static getBitwiseAllExpression(columnInfo: ColumnInfo, filterValues: any[]): SqlTemplate {
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = `${columnInfo.getQueryColumn()} & ? = ?`;
    const filterValue = filterValues[0];
    sqlParam.params = sqlParam.params.concat(filterValue, filterValue);
    return sqlParam;
  }

  private constructor() {
    // hide
  }
}
