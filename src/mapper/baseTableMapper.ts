import * as lodash from "lodash";
import { IConnection } from "../connection";
import { CommonHelper, EntityHelper } from "../helper";
import { DatabaseType, DynamicQuery, FilterDescriptor, FilterOperator, RelationBase, TableEntity } from "../model";
import { SqlTemplateProvider } from "../provider";
import { BaseMybatisMapper } from "./baseMybatisMapper";

export abstract class BaseTableMapper<T extends TableEntity> extends BaseMybatisMapper<T> {
    constructor(sqlConnection: IConnection) {
        super(sqlConnection);
    }

    public insert(o: T): Promise<number> {
        return this.insertInternal(o, false);
    }

    public insertSelective(o: T): Promise<number> {
        return this.insertInternal(o, true);
    }

    public updateByPrimaryKey(o: T): Promise<number> {
        return this.updateByPrimaryKeyInternal(o, false);
    }

    public updateByPrimaryKeySelective(o: T): Promise<number> {
        return this.updateByPrimaryKeyInternal(o, true);
    }

    public selectByExample(example: T, relations: RelationBase[] = []): Promise<T[]> {
        try {
            const sqlParam = SqlTemplateProvider.getSelect<T>(example);
            const entityClass = EntityHelper.getEntityClass<T>(example);
            return super.selectEntities(sqlParam.sqlExpression, sqlParam.params, relations);
        } catch (e) {
            return new Promise<T[]>((resolve, reject) => reject(e));
        }
    }

    public selectByPrimaryKey(key: any, relations: RelationBase[] = []): Promise<T[]> {
        try {
            const entityClass = this.getEntityClass();
            const sqlParam = SqlTemplateProvider.getSelectByPk<T>(entityClass, key);
            return super.selectEntities(sqlParam.sqlExpression, sqlParam.params, relations);
        } catch (e) {
            return new Promise<T[]>((resolve, reject) => reject(e));
        }
    }

    public selectByDynamicQuery(query: DynamicQuery<T>, relations: RelationBase[] = []): Promise<T[]> {
        try {
            const entityClass = this.getEntityClass();
            const sqlParam = SqlTemplateProvider.getSelectByDynamicQuery<T>(entityClass, query);
            return super.selectEntities(sqlParam.sqlExpression, sqlParam.params, relations);
        } catch (e) {
            return new Promise<T[]>((resolve, reject) => reject(e));
        }
    }

    public selectCountByExample(example: T): Promise<number> {
        try {
            const sqlParam = SqlTemplateProvider.getSelectCount<T>(example);
            return super.selectCount(sqlParam.sqlExpression, sqlParam.params);
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    public selectCountByPrimaryKey(key: any): Promise<number> {
        try {
            const entityClass = this.getEntityClass();
            const sqlParam = SqlTemplateProvider.getSelectCountByPk<T>(entityClass, key);
            return super.selectCount(sqlParam.sqlExpression, sqlParam.params);
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    public selectCountByDynamicQuery(query: DynamicQuery<T>): Promise<number> {
        try {
            const entityClass = this.getEntityClass();
            const sqlParam = SqlTemplateProvider.getSelectCountByDynamicQuery<T>(entityClass, query);
            return super.selectCount(sqlParam.sqlExpression, sqlParam.params);
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    public deleteByExample(example: T): Promise<number> {
        try {
            const sqlParam = SqlTemplateProvider.getDelete<T>(example);
            return this.deleteInternal(sqlParam.sqlExpression, sqlParam.params);
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    public deleteByPrimaryKey(key: any): Promise<number> {
        try {
            const entityClass = this.getEntityClass();
            const sqlParam = SqlTemplateProvider.getDeleteByPk<T>(entityClass, key);
            return this.deleteInternal(sqlParam.sqlExpression, sqlParam.params);
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    public deleteByDynamicQuery(query: DynamicQuery<T>): Promise<number> {
        try {
            const entityClass = this.getEntityClass();
            const sqlParam = SqlTemplateProvider.getDeleteByDynamicQuery<T>(entityClass, query);
            return this.deleteInternal(sqlParam.sqlExpression, sqlParam.params);
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    private async insertInternal(o: T, selective: boolean): Promise<number> {
        try {
            const sqlParam = SqlTemplateProvider.getInsert<T>(o, selective);
            const result = await super.run(sqlParam.sqlExpression, sqlParam.params);
            let insertId: number;
            let effectCount: number;
            const keyColumn = SqlTemplateProvider.getPkColumn<T>(o);

            if (this.connection.getDataBaseType() === DatabaseType.MYSQL) {
                if (keyColumn && keyColumn.autoIncrease) {
                    insertId = Number(result.insertId);
                }
                effectCount = Number(result.affectedRows);
            } else if (this.connection.getDataBaseType() === DatabaseType.SQLITE3) {
                if (keyColumn && keyColumn.autoIncrease) {
                    insertId = await this.getSeqIdForSqlite(o);
                }
                effectCount = await this.getEffectCountForSqlite();
            } else {
                insertId = 0;
                effectCount = 0;
            }

            // assgin id;
            if (keyColumn && keyColumn.autoIncrease) {
                o[keyColumn.property] = insertId;
            }
            return new Promise<number>((resolve, reject) => resolve(effectCount));
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    private async updateByPrimaryKeyInternal(o: T, selective: boolean): Promise<number> {
        try {
            const sqlParam = SqlTemplateProvider.getUpdateByPk<T>(o, selective);
            const result = await super.run(sqlParam.sqlExpression, sqlParam.params);
            let effectCount: number;
            if (this.connection.getDataBaseType() === DatabaseType.MYSQL) {
                effectCount = Number(result.affectedRows);
            } else if (this.connection.getDataBaseType() === DatabaseType.SQLITE3) {
                effectCount = await this.getEffectCountForSqlite();
            } else {
                effectCount = 0;
            }
            return new Promise<number>((resolve, reject) => resolve(effectCount));
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    private async deleteInternal(plainSql: string, params: any[]): Promise<number> {
        try {
            const result = await super.run(plainSql, params);
            let effectCount: number;
            if (this.connection.getDataBaseType() === DatabaseType.MYSQL) {
                effectCount = Number(result.affectedRows);
            } else if (this.connection.getDataBaseType() === DatabaseType.SQLITE3) {
                effectCount = await this.getEffectCountForSqlite();
            } else {
                effectCount = 0;
            }
            return new Promise<number>((resolve, reject) => resolve(effectCount));
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    private async getSeqIdForSqlite(o: T): Promise<number> {
        try {
            const sql = "SELECT seq FROM sqlite_sequence WHERE name = ?";
            const tableName = o.getTableName();
            const result = await super.select(sql, [tableName]);
            return new Promise<number>((resolve, reject) => {
                if (result.length > 0) {
                    const seqId = Number(result[0].seq);
                    resolve(seqId);
                } else {
                    reject(new Error("cannot find seqId"));
                }
            });
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }

    private async getEffectCountForSqlite(): Promise<number> {
        try {
            const entityClass = this.getEntityClass();
            const tableName = new entityClass().getTableName();
            const sql = `SELECT changes() as change FROM ${tableName}`;
            const result = await super.select(sql, []);
            return new Promise<number>((resolve, reject) => {
                const change = Number(result[0].change);
                resolve(change);
            });
        } catch (e) {
            return new Promise<number>((resolve, reject) => reject(e));
        }
    }
}
