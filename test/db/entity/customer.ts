import { column, TableEntity } from "../../../src/";

export class Customer extends TableEntity {
    @column("Id", true, false)
    public id: string;
    @column("CompanyName", false, true)
    public companyName: string;
    @column("ContactName", false, true)
    public contactName: string;
    @column("ContactTitle", false, true)
    public contactTitle: string;
    @column("Address", false, true)
    public address: string;
    @column("City", false, true)
    public city: string;
    @column("Region", false, true)
    public region: string;
    @column("PostalCode", false, true)
    public postalCode: string;
    @column("Country", false, true)
    public country: string;
    @column("Phone", false, true)
    public phone: string;
    @column("Fax", false, true)
    public fax: string;

    public getTableName(): string {
        return "Customer";
    }
}
