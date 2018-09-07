import { QueryCacheInternal } from "./queryCacheInternal";
import { DynamicQuery } from "ts-dynamic-query";

export class QueryCache {
  private static readonly queryCache = QueryCacheInternal.getInstance();
  private constructor() {}
  public static addQuery(query: DynamicQuery<any>): void {
    return this.queryCache.addQuery(query, null);
  }

  public static removeQuery(query: DynamicQuery<any>): boolean {
    return this.queryCache.removeQuery(query);
  }

  public static clearQuerys(): void {
    return this.queryCache.clearQuerys();
  }

  public static getAllQuerys(): IterableIterator<DynamicQuery<any>> {
    return this.queryCache.getAllQuerys();
  }
}
