import { ArrayUtils, ObjectUtils, StringUtils } from "ts-commons";
import {
  DynamicQuery,
  FilterCondition,
  FilterDescriptor,
  BaseFilterDescriptor,
  FilterGroupDescriptor,
  SortDescriptor,
  BaseSortDescriptor,
  SortDirection,
} from "ts-dynamic-query";
import { EntityCache } from "../cache";
import { QueryCacheInternal } from "../cache/queryCacheInternal";
import { EntityHelper, FilterHelper } from "../helper";
import { ColumnInfo, CustomFilterDescriptor, CustomSortDescriptor, Entity, SqlTemplate, TableEntity } from "../model";

export class SqlTemplateProvider {
  public static getPkColumn<T extends TableEntity>(o: T): ColumnInfo {
    const columnInfos = SqlTemplateProvider.getColumnInfos(o);
    return columnInfos.find((s) => s.isPK);
  }

  public static getInsert<T extends TableEntity>(o: T, selective: boolean): SqlTemplate {
    const columnInfos = SqlTemplateProvider.getColumnInfos(o);
    const columnNames: string[] = [];
    const placeholders: string[] = [];
    const params: any[] = [];
    columnInfos.forEach((colInfo) => {
      if (colInfo.autoIncrease) {
        return;
      }

      let propValue = o[colInfo.property];
      if (selective && ObjectUtils.isNullOrUndefined(propValue)) {
        return;
      }
      propValue = SqlTemplateProvider.toDbParam(ObjectUtils.isNullOrUndefined(propValue) ? null : propValue);
      params.push(propValue);
      columnNames.push(colInfo.columnName);
      placeholders.push("?");
    });

    const tableName = o.getTableName();
    const columnNamesStr = columnNames.join(", ");
    const placeholderStr = placeholders.join(", ");
    const sqlExpression = `INSERT INTO ${tableName} (${columnNamesStr}) VALUES (${placeholderStr})`;

    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = sqlExpression;
    sqlParam.params = params;
    return sqlParam;
  }

  public static getDeleteByPk<T extends TableEntity>(entityClass: { new (): T }, key: any): SqlTemplate {
    const columnInfos = SqlTemplateProvider.getColumnInfos(entityClass);
    const keyColumn = columnInfos.find((s) => s.isPK);
    if (ObjectUtils.isNullOrUndefined(keyColumn)) {
      throw new Error("cannot find key, please set iskey property in @column.");
    }

    const tableName = new entityClass().getTableName();
    const keyColumnName = keyColumn.columnName;
    const expression = `DELETE FROM ${tableName} WHERE ${keyColumnName} = ?`;
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = expression;
    sqlParam.params.push(key);
    return sqlParam;
  }

  public static getDelete<T extends TableEntity>(example: T): SqlTemplate {
    const query = this.generateDynamicQueryByExample<T>(example);
    const entityClass = EntityHelper.getEntityClass<T>(example);
    return this.getDeleteByDynamicQuery<T>(entityClass, query);
  }

  public static getDeleteByDynamicQuery<T extends TableEntity>(
    entityClass: { new (): T },
    query: DynamicQuery<T>,
  ): SqlTemplate {
    const table = new entityClass().getTableName();
    const deleteSql = `DELETE FROM ${table}`;
    return this.getSqlByDynamicQuery<T>(entityClass, deleteSql, query);
  }

  public static getUpdateByPk<T extends TableEntity>(o: T, selective: boolean): SqlTemplate {
    const columnInfos = SqlTemplateProvider.getColumnInfos(o);
    const keyColumn = columnInfos.find((s) => s.isPK);
    if (ObjectUtils.isNullOrUndefined(keyColumn)) {
      throw new Error("cannot find key, please set iskey property in @column.");
    }

    const tableName = o.getTableName();
    const sets: string[] = [];
    const params: any[] = [];
    columnInfos.forEach((colInfo) => {
      if (colInfo.property === keyColumn.property) {
        // don't update key column.
        return;
      }

      let propValue = o[colInfo.property];
      if (selective && ObjectUtils.isNullOrUndefined(propValue)) {
        return;
      }

      propValue = SqlTemplateProvider.toDbParam(ObjectUtils.isNullOrUndefined(propValue) ? null : propValue);
      sets.push(colInfo.columnName + " = ?");
      params.push(propValue);
    });
    const setStr = sets.join(", ");
    const whereStr = keyColumn.columnName + " = ?";
    params.push(o[keyColumn.property]);
    const sqlExpression = `UPDATE ${tableName} SET ${setStr} WHERE ${whereStr}`;

    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = sqlExpression;
    sqlParam.params = params;
    return sqlParam;
  }

  public static getSelectByPk<T extends TableEntity>(entityClass: { new (): T }, key: any): SqlTemplate {
    const columnInfos = SqlTemplateProvider.getColumnInfos(entityClass);
    const keyColumn = columnInfos.find((s) => s.isPK);
    if (ObjectUtils.isNullOrUndefined(keyColumn)) {
      throw new Error("cannot find key, please set iskey property in @column.");
    }

    const tableName = new entityClass().getTableName();
    const columnAsStr = SqlTemplateProvider.getColumnsAsUnderscoreProps(columnInfos);
    const whereStr = keyColumn.columnName + " = ?";
    const sqlExpression = `SELECT ${columnAsStr} FROM ${tableName} WHERE ${whereStr}`;
    const params: any[] = [];
    params.push(key);

    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = sqlExpression;
    sqlParam.params = params;
    return sqlParam;
  }

  public static getSelect<T extends TableEntity>(example: T): SqlTemplate {
    const query = this.generateDynamicQueryByExample<T>(example);
    const entityClass = EntityHelper.getEntityClass<T>(example);
    return this.getSelectByDynamicQuery<T>(entityClass, query);
  }

  public static getSelectCountByPk<T extends TableEntity>(entityClass: { new (): T }, pk: any): SqlTemplate {
    const columnInfos = SqlTemplateProvider.getColumnInfos(entityClass);
    const keyColumn = columnInfos.find((s) => s.isPK);
    if (ObjectUtils.isNullOrUndefined(keyColumn)) {
      throw new Error("cannot find key, please set iskey property in @column.");
    }

    const tableName = new entityClass().getTableName();
    const whereStr = keyColumn.columnName + " = ?";
    const sqlExpression = `SELECT COUNT(0) FROM ${tableName} WHERE ${whereStr}`;
    const params: any[] = [];
    params.push(pk);

    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = sqlExpression;
    sqlParam.params = params;
    return sqlParam;
  }

  public static getSelectCount<T extends TableEntity>(example: T): SqlTemplate {
    const query = this.generateDynamicQueryByExample<T>(example);
    const entityClass = EntityHelper.getEntityClass<T>(example);
    return this.getSelectCountByDynamicQuery<T>(entityClass, query);
  }

  public static getSelectByDynamicQuery<T extends TableEntity>(
    entityClass: { new (): T },
    query: DynamicQuery<T>,
  ): SqlTemplate {
    const selectSql = this.getSelectSql(entityClass, query);
    return SqlTemplateProvider.getSqlByDynamicQuery<T>(entityClass, selectSql, query);
  }

  public static getSelectCountByDynamicQuery<T extends TableEntity>(
    entityClass: { new (): T },
    query: DynamicQuery<T>,
  ): SqlTemplate {
    const selectSql = this.getSelectCountSql(entityClass);
    return SqlTemplateProvider.getSqlByDynamicQuery<T>(entityClass, selectSql, query);
  }

  public static getSelectSql<T extends TableEntity>(entityClass: { new (): T }, dynamicQuery: DynamicQuery<T>) {
    const columnInfos = SqlTemplateProvider.getColumnInfos(new entityClass());
    const selectedProperties = dynamicQuery.getSelectedProperties();
    const useColumnInfos = ArrayUtils.isEmpty(selectedProperties)
      ? columnInfos
      : columnInfos.filter((colInfo) => ArrayUtils.contains(selectedProperties, colInfo.property));

    const table = new entityClass().getTableName();
    const columnStr = SqlTemplateProvider.getColumnsAsUnderscoreProps(useColumnInfos);
    const selectSql = `SELECT ${columnStr} FROM ${table}`;
    return selectSql;
  }

  public static getSelectCountSql<T extends TableEntity>(entityClass: { new (): T }) {
    const table = new entityClass().getTableName();
    const selectSql = `SELECT COUNT(0) FROM ${table}`;
    return selectSql;
  }

  public static getSqlByDynamicQuery<T extends Entity>(
    entityClass: { new (): T },
    sql: string,
    dynamicQuery: DynamicQuery<T>,
  ): SqlTemplate {
    const filterSortExpression = this.getFilterSortExpression(entityClass, dynamicQuery);
    const expression = `${sql}${filterSortExpression.sqlExpression}`;
    const result = new SqlTemplate();
    result.sqlExpression = expression;
    result.params = filterSortExpression.params;
    return result;
  }

  // store with cache
  public static getFilterSortExpression<T extends Entity>(
    entityClass: { new (): T },
    dynamicQuery: DynamicQuery<T>,
  ): SqlTemplate {
    const cacheSqlTemplate = this.queryCache.getCache(dynamicQuery);
    if (!ObjectUtils.isNullOrUndefined(cacheSqlTemplate)) {
      return cacheSqlTemplate;
    }

    let expression = "";
    const useQuery = ObjectUtils.isNullOrUndefined(dynamicQuery) ? new DynamicQuery() : dynamicQuery;
    const filterSqlParam = this.getFilterExpression<T>(entityClass, useQuery.getFilters());
    const sortSqlParam = this.getSortExpression<T>(entityClass, useQuery.getSorts());
    expression = StringUtils.isBlank(filterSqlParam.sqlExpression)
      ? expression
      : `${expression} WHERE ${filterSqlParam.sqlExpression}`;
    expression = StringUtils.isBlank(sortSqlParam.sqlExpression)
      ? expression
      : `${expression} ORDER BY ${sortSqlParam.sqlExpression}`;
    let params: any = [];
    params = params.concat(filterSqlParam.params);
    params = params.concat(sortSqlParam.params);

    const result = new SqlTemplate();
    result.sqlExpression = expression;
    result.params = params;

    if (this.queryCache.containsQuery(dynamicQuery)) {
      this.queryCache.addQuery(dynamicQuery, result);
    }
    return result;
  }

  public static getFilterExpression<T extends Entity>(
    entityClass: { new (): T },
    filters: BaseFilterDescriptor<T>[],
  ): SqlTemplate {
    if (ObjectUtils.isNullOrUndefined(filters) || filters.length === 0) {
      return new SqlTemplate();
    }

    let expression: string;
    let params: any[] = [];
    filters.forEach((filter) => {
      const sqlParam = SqlTemplateProvider.getFilterExpressionByFilterBase(entityClass, filter);
      if (sqlParam != null && StringUtils.isNotBlank(sqlParam.sqlExpression)) {
        params = params.concat(sqlParam.params);

        expression = StringUtils.isBlank(expression)
          ? sqlParam.sqlExpression
          : `${expression} ${FilterCondition[filter.getCondition()]} ${sqlParam.sqlExpression}`;
      }
    });

    const result = new SqlTemplate();
    result.sqlExpression = `(${expression})`;
    result.params = result.params.concat(params);
    return result;
  }

  public static getSortExpression<T extends Entity>(
    entityClass: { new (): T },
    sorts: BaseSortDescriptor[],
  ): SqlTemplate {
    if (ObjectUtils.isNullOrUndefined(sorts) || sorts.length === 0) {
      return new SqlTemplate();
    }

    let expression: string;
    let params: any[] = [];
    sorts.forEach((sort) => {
      const sqlParam = SqlTemplateProvider.getSortExpressionBySortBase(entityClass, sort);
      if (sqlParam != null && StringUtils.isNotBlank(sqlParam.sqlExpression)) {
        params = params.concat(sqlParam.params);

        expression = StringUtils.isBlank(expression)
          ? sqlParam.sqlExpression
          : `${expression}, ${sqlParam.sqlExpression}`;
      }
    });

    const result = new SqlTemplate();
    result.sqlExpression = expression;
    result.params = result.params.concat(params);
    return result;
  }

  public static getColumnsExpressionWithProperties<T extends Entity>(
    entityClass: { new (): T },
    props: Array<keyof T>,
  ): string {
    const targetConstructor = EntityHelper.getTargetConstrutor(entityClass);
    if (ObjectUtils.isNullOrUndefined(targetConstructor)) {
      throw new Error("cannot find entity, please set @column to entity!");
    }

    const allColumnInfos = EntityCache.getInstance().getColumnInfos(targetConstructor);
    let columnInfos: ColumnInfo[];
    if (ArrayUtils.isEmpty(props)) {
      columnInfos = allColumnInfos;
    } else {
      const propStrs: string[] = props.map((x) => x.toString());
      columnInfos = allColumnInfos.filter((colInfo) => {
        return propStrs.indexOf(colInfo.property) >= 0;
      });
    }
    return SqlTemplateProvider.getColumnsAsUnderscoreProps(columnInfos);
  }

  public static getColumnsExpressionWithoutProperties<T extends Entity>(
    entityClass: { new (): T },
    props: Array<keyof T>,
  ): string {
    const targetConstructor = EntityHelper.getTargetConstrutor(entityClass);
    if (ObjectUtils.isNullOrUndefined(targetConstructor)) {
      throw new Error("cannot find entity, please set @column to entity!");
    }

    const allColumnInfos = EntityCache.getInstance().getColumnInfos(targetConstructor);
    let columnInfos: ColumnInfo[];
    if (ArrayUtils.isEmpty(props)) {
      columnInfos = allColumnInfos;
    } else {
      const propStrs: string[] = props.map((x) => x.toString());
      columnInfos = allColumnInfos.filter((colInfo) => {
        return propStrs.indexOf(colInfo.property) < 0;
      });
    }
    return SqlTemplateProvider.getColumnsAsUnderscoreProps(columnInfos);
  }

  public static getColumnsExpression<T extends Entity>(entityClass: { new (): T }): string {
    const targetConstructor = EntityHelper.getTargetConstrutor(entityClass);
    if (ObjectUtils.isNullOrUndefined(targetConstructor)) {
      throw new Error("cannot find entity, please set @column to entity!");
    }

    const columnInfos = EntityCache.getInstance().getColumnInfos(targetConstructor);
    return SqlTemplateProvider.getColumnsAsUnderscoreProps(columnInfos);
  }

  public static getColumnInfos<T extends Entity>(o: T | { new (): T }): ColumnInfo[] {
    const targetConstructor = EntityHelper.getTargetConstrutor(o);
    if (ObjectUtils.isNullOrUndefined(targetConstructor)) {
      throw new Error("cannot find entity, please set @column to entity!");
    }

    const columnInfos = EntityCache.getInstance().getColumnInfos(targetConstructor);
    return columnInfos;
  }

  //#region filter
  public static getFilterExpressionByFilterBase<T extends Entity>(
    entityClass: { new (): T },
    filter: BaseFilterDescriptor<T>,
  ): SqlTemplate {
    if (filter instanceof FilterDescriptor) {
      return SqlTemplateProvider.getFilterExpressionByFilterDescriptor(entityClass, filter);
    } else if (filter instanceof FilterGroupDescriptor) {
      return SqlTemplateProvider.getFilterExpression(entityClass, filter.getFilters());
    } else if (filter instanceof CustomFilterDescriptor) {
      return SqlTemplateProvider.getFilterExpressionByCustomFilterDescriptor(entityClass, filter);
    } else {
      return new SqlTemplate();
    }
  }

  public static getFilterExpressionByFilterDescriptor<T extends Entity>(
    entityClass: { new (): T },
    filter: FilterDescriptor<T>,
  ): SqlTemplate {
    const value = filter.value;
    const operator = filter.operator;
    const propertyPath = filter.propertyPath;
    const targetConstructor = EntityHelper.getTargetConstrutor(entityClass);
    const columnInfo = EntityCache.getInstance().getColumnInfo(targetConstructor, propertyPath);
    return FilterHelper.getFilterExpression(operator, columnInfo, value);
  }

  public static getFilterExpressionByCustomFilterDescriptor<T extends Entity>(
    entityClass: { new (): T },
    filter: CustomFilterDescriptor,
  ): SqlTemplate {
    const sqlParam = new SqlTemplate();
    let expression = StringUtils.isBlank(filter.expression) ? "" : filter.expression;
    for (let i = 0; i < filter.params.length; i++) {
      expression = expression.replace(`{${i}}`, "?");
    }
    sqlParam.params = sqlParam.params.concat(filter.params);
    sqlParam.sqlExpression = expression;
    return sqlParam;
  }

  //#endregion

  //#region sort
  public static getSortExpressionBySortBase<T extends Entity>(
    entityClass: { new (): T },
    sort: BaseSortDescriptor,
  ): SqlTemplate {
    if (sort instanceof SortDescriptor) {
      return SqlTemplateProvider.getSortExpressionBySortDescriptor(entityClass, sort);
    } else if (sort instanceof CustomSortDescriptor) {
      return SqlTemplateProvider.getSortExpressionByCustomSortDescriptor(entityClass, sort);
    } else {
      return new SqlTemplate();
    }
  }

  public static getSortExpressionBySortDescriptor<T extends Entity>(
    entityClass: { new (): T },
    sort: SortDescriptor<T>,
  ): SqlTemplate {
    const targetConstructor = EntityHelper.getTargetConstrutor(entityClass);
    const columnInfo = EntityCache.getInstance().getColumnInfo(targetConstructor, sort.propertyPath);
    const directionStr = SortDirection[sort.direction];
    const queryColumn = columnInfo.getQueryColumn();
    const expression = `${queryColumn} ${directionStr}`;
    const sqlParam = new SqlTemplate();
    sqlParam.sqlExpression = expression;
    return sqlParam;
  }

  public static getSortExpressionByCustomSortDescriptor<T extends Entity>(
    entityClass: { new (): T },
    sort: CustomSortDescriptor,
  ): SqlTemplate {
    const sqlParam = new SqlTemplate();
    let expression = StringUtils.isBlank(sort.expression) ? "" : sort.expression;
    for (let i = 0; i < sort.params.length; i++) {
      expression = expression.replace(`{${i}}`, "?");
    }
    sqlParam.params = sqlParam.params.concat(sort.params);
    sqlParam.sqlExpression = expression;
    return sqlParam;
  }

  //#endregion

  public static getColumnsAsUnderscoreProps(columnInfos: ColumnInfo[]): string {
    return columnInfos.map((s) => s.getQueryColumn() + " AS " + s.property).join(", ");
  }

  public static generateDynamicQueryByExample<T>(example: T): DynamicQuery<T> {
    const dynamicQuery = new DynamicQuery<T>();
    for (const prop in example) {
      if (example.hasOwnProperty(prop) && !ObjectUtils.isNullOrUndefined(example[prop])) {
        const filter = new FilterDescriptor();
        filter.propertyPath = prop;
        filter.value = example[prop] as any;
        dynamicQuery.addFilters([filter]);
      }
    }
    return dynamicQuery;
  }

  private static readonly queryCache: QueryCacheInternal = QueryCacheInternal.getInstance();

  private static toDbParam(param: any): any {
    if (param instanceof Date) {
      return param.toISOString().slice(0, 19).replace("T", " ");
    } else {
      return param;
    }
  }

  public constructor() {
    // hide constructor
  }
}
