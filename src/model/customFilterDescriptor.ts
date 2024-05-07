import { deserialize, serialize } from "class-transformer";
import { BaseFilterDescriptor, FilterCondition } from "ts-dynamic-query";

export class CustomFilterDescriptor implements BaseFilterDescriptor<unknown> {
  public expression: string;
  public params: any[];
  public readonly type: string = "CustomFilterDescriptor";
  constructor() {
    this.expression = "";
    this.params = [];
  }

  public toJSON(): string {
    return serialize(this);
  }

  public getCondition(): FilterCondition {
    return FilterCondition.AND;
  }

  public fromJSON(json: string): CustomFilterDescriptor {
    const obj = deserialize(CustomFilterDescriptor, json);
    this.expression = obj.expression;
    this.params = obj.params;
    return this;
  }
}
