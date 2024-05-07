import { expect } from "chai";
import { FilterCondition, FilterGroupDescriptor } from "ts-dynamic-query";

describe(".FilterGroupDescriptor", () => {
  describe("#constructor", () => {
    it("constructor", () => {
      const sort = new FilterGroupDescriptor();
      expect(0).to.be.eq(sort.getFilters().length);
      expect(FilterCondition.AND).to.be.eq(sort.condition);
    });
  });
});
