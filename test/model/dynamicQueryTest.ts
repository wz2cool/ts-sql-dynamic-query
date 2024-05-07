import { expect } from "chai";
import { DynamicQuery, FilterCondition, FilterDescriptor, FilterOperator, SortDirection } from "ts-dynamic-query";
import { CustomSortDescriptor } from "../../src/model";
import { Student } from "./student";

describe(".dynanmicQuery", () => {
  describe("#addFilters", () => {
    it("add filter", () => {
      const filter = new FilterDescriptor<Student>({
        propertyPath: "name",
        operator: FilterOperator.EQUAL,
        value: "frank",
      });
      const query = new DynamicQuery<Student>().addFilters([filter]);
      expect(1).to.be.eq(query.getFilters().length);
      expect(FilterCondition.AND).to.be.eq(query.getFilters()[0].getCondition());
    });
  });

  describe("#addSorts", () => {
    it("add sort", () => {
      const sort = new CustomSortDescriptor();
      sort.expression = "test";

      const query = new DynamicQuery<Student>().addSorts([sort]);

      expect(1).to.be.eq(query.getSorts().length);
      expect(SortDirection.ASC).to.be.eq(query.getSorts()[0].direction);
    });
  });
});
