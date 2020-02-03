class Lead {
    id: number;
    name: string;
    expectedRevenue: string; // string because formatted
    plannedRevenue: string;
    currencySymbol: string;

    getExpectedRevenueWithCurrency(): string {
        if (this.currencySymbol)
            return this.expectedRevenue + this.currencySymbol;
        return this.expectedRevenue;
    }
    getPlannedRevenueWithCurrency(): string {
        if (this.currencySymbol)
            return this.plannedRevenue + this.currencySymbol;
        return this.plannedRevenue;
    }

    static fromJSON(o: Object): Lead {
        var lead = new Lead();
        lead.id = o['id'];
        lead.name = o['name'];
        lead.expectedRevenue = o['expected_revenue'];
        lead.plannedRevenue = o['planned_revenue'];
        lead.currencySymbol = o['currency_symbol'];
        return lead;
    }
}

export default Lead;