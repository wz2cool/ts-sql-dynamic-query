import { ObjectUtils } from "ts-commons";
import { DynamicQuery, FilterDescriptor, BaseFilterDescriptor, BaseSortDescriptor } from "ts-dynamic-query";
import { EntityCache } from "../cache";
import { IConnection } from "../connection";
import { AssociationRelation, Entity, Page, PageRowBounds, RelationBase, RowBounds, SqlTemplate } from "../model";
import { SqlTemplateProvider } from "../provider";

export abstract class BaseMapper<T extends Entity> {
  protected readonly connection: IConnection;
  protected readonly entityCache = EntityCache.getInstance();
  constructor(connection: IConnection) {
    this.connection = connection;
  }

  public abstract getEntityClass(): { new (): T };

  public getColumnExpression(): string {
    return SqlTemplateProvider.getColumnsExpression(this.getEntityClass());
  }

  public getFilterExpression(filters: BaseFilterDescriptor<T>[]): SqlTemplate {
    return SqlTemplateProvider.getFilterExpression(this.getEntityClass(), filters);
  }

  public getSortExpression(sorts: BaseSortDescriptor[]): SqlTemplate {
    return SqlTemplateProvider.getSortExpression(this.getEntityClass(), sorts);
  }

  public run(plainSql: string, params: any[]): Promise<any> {
    return this.connection.run(plainSql, params);
  }

  public selectEntities(plainSql: string, params: any[], relations: RelationBase[] = []): Promise<T[]> {
    return this.selectEntitiesWithRelationInteral(plainSql, params, relations);
  }

  public selectEntitiesRowBounds(
    plainSql: string,
    params: any[],
    rowBounds: RowBounds,
    relations: RelationBase[] = [],
  ): Promise<T[]> {
    return this.selectEntitiesRowBoundWithRelationInteral(plainSql, params, rowBounds, relations);
  }

  public async selectEntitiesPageRowBounds(
    plainSql: string,
    params: any[],
    pageRowBounds: PageRowBounds,
    relations: RelationBase[] = [],
  ): Promise<Page<T>> {
    try {
      const entityClass = this.getEntityClass();
      const entities = await this.selectEntitiesRowBounds(plainSql, params, pageRowBounds, relations);
      const selectCountSql = `SELECT COUNT(0) FROM (${plainSql}) AS t`;
      const total = await this.selectCount(selectCountSql, params);
      const page = new Page<T>(pageRowBounds.getPageNum(), pageRowBounds.getPageSize(), total, entities);
      return new Promise<Page<T>>((resolve, reject) => resolve(page));
    } catch (e) {
      return new Promise<Page<T>>((resolve, reject) => reject(e));
    }
  }

  public select(plainSql: string, params: any[]): Promise<any[]> {
    return this.connection.select(plainSql, params);
  }

  public selectCount(plainSql: string, params: any[]): Promise<number> {
    return this.connection.selectCount(plainSql, params);
  }

  private async selectEntitiesWithRelationInteral(
    plainSql: string,
    params: any[],
    relations: RelationBase[],
  ): Promise<T[]> {
    try {
      const entityClass = this.getEntityClass();
      const entities = await this.selectEntitiesInternal<T>(entityClass, plainSql, params);
      if (
        !ObjectUtils.isNullOrUndefined(entities) &&
        entities.length > 0 &&
        !ObjectUtils.isNullOrUndefined(relations) &&
        relations.length > 0
      ) {
        for (const entity of entities) {
          for (const relation of relations) {
            await this.assignRelationInternal(entity, relation);
          }
        }
      }
      return new Promise<T[]>((resolve, reject) => resolve(entities));
    } catch (e) {
      return new Promise<T[]>((resolve, reject) => reject(e));
    }
  }

  private async selectEntitiesRowBoundWithRelationInteral(
    plainSql: string,
    params: any[],
    rowBounds: RowBounds,
    relations: RelationBase[],
  ) {
    const paging = this.connection.getRowBoundsExpression(rowBounds);
    const selectPagingSql = `${plainSql} ${paging}`;
    return this.selectEntitiesWithRelationInteral(selectPagingSql, params, relations);
  }

  private async assignRelationInternal<TR extends Entity>(sourceEntity: TR, relation: RelationBase): Promise<void> {
    try {
      const mappingProp = relation.getMappingProp();
      const sourceValue = sourceEntity[relation.getSourceProp()];
      const refEntityClass = relation.getTargetEntityClass();
      let dynamicQuery = relation.getDynamicQuery();
      const refColumnFilter = new FilterDescriptor();
      refColumnFilter.propertyPath = relation.getTargetProp();
      refColumnFilter.value = sourceValue;

      if (ObjectUtils.isNullOrUndefined(dynamicQuery)) {
        dynamicQuery = new DynamicQuery().addFilters([refColumnFilter]);
      } else {
        dynamicQuery.addFilters([refColumnFilter]);
      }
      const sqlTemplate = SqlTemplateProvider.getSqlByDynamicQuery(
        refEntityClass,
        relation.getSelectSql(),
        dynamicQuery,
      );

      let nestEntities;
      if (relation instanceof AssociationRelation) {
        // only take one row.
        const rowBounds = new RowBounds(0, 1);
        nestEntities = await this.selectEntitiesRowBoundInternal(
          refEntityClass,
          sqlTemplate.sqlExpression,
          sqlTemplate.params,
          rowBounds,
        );
        if (!ObjectUtils.isNullOrUndefined(nestEntities) && nestEntities.length > 0) {
          sourceEntity[mappingProp] = nestEntities[0];
        }
      } else {
        // one to many.
        nestEntities = await this.selectEntitiesInternal(refEntityClass, sqlTemplate.sqlExpression, sqlTemplate.params);
        sourceEntity[mappingProp] = nestEntities;
      }

      if (!ObjectUtils.isNullOrUndefined(relation.relations) && relation.relations.length > 0) {
        for (const nestEntity of nestEntities) {
          for (const nestRelation of relation.relations) {
            await this.assignRelationInternal(nestEntity, nestRelation);
          }
        }
      }
      return new Promise<void>((resolve, reject) => resolve());
    } catch (e) {
      return new Promise<void>((resolve, reject) => reject(e));
    }
  }

  private selectEntitiesInternal<TR>(entityClass: { new (): TR }, plainSql: string, params: any[]): Promise<TR[]> {
    return this.connection.selectEntities(entityClass, plainSql, params);
  }

  private selectEntitiesRowBoundInternal<TR>(
    entityClass: { new (): TR },
    plainSql: string,
    params: any[],
    rowBounds: RowBounds,
    relations: RelationBase[] = [],
  ): Promise<TR[]> {
    const paging = this.connection.getRowBoundsExpression(rowBounds);
    const selectPagingSql = `${plainSql} ${paging}`;
    return this.selectEntitiesInternal<TR>(entityClass, selectPagingSql, params);
  }
}
