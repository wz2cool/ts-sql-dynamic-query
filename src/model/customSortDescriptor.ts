import { deserialize, serialize } from "class-transformer";
import { BaseSortDescriptor } from "ts-dynamic-query";

export class CustomSortDescriptor extends BaseSortDescriptor {
  public expression: string;
  public params: any[];

  constructor() {
    super("CustomSortDescriptor");
    this.expression = "";
    this.params = [];
  }

  public toJSON(): string {
    return serialize(this);
  }

  public fromJSON(json: string): CustomSortDescriptor {
    const obj = deserialize(CustomSortDescriptor, json);
    this.expression = obj.expression;
    this.params = obj.params;
    return this;
  }
}
