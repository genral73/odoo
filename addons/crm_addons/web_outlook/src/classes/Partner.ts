import Address from './Address';
import Company from './Company';
import EnrichmentError from './EnrichmentError';
import Lead from './Lead';

class Partner {
    id: number;
    name: string;
    address: Address;
    title: string; // job title
    phone: string;
    mobile: string;
    email: string;
    company: Company;
    leads: Lead[];
    image: string;
    initials: string;
    enrichmentError: EnrichmentError;
    created: boolean;

    constructor() {
        this.id = 0;
        this.name = "";
        this.address = new Address();
        this.title = "";
        this.phone = "";
        this.mobile = "";
        this.email = "";
        this.company = new Company();
        this.image = "";
        this.enrichmentError = new EnrichmentError();
        this.created = false;
        this.leads = [];
    }

    // TODO: setter for "name" that generate the initials.
    getInitials() : string {
        if (!this.name) {
            return "";
        }
        const names = this.name.split(" ");
        let initials = names[0].substring(0, 1).toUpperCase();
        
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase();
        }
        return initials;
    };

    static fromJSON(o: Object): Partner {
        var partner = Object.assign(new Partner(), o);
        partner.address = Address.fromJSON(o['address']);
        partner.company = Company.fromJSON(o['company']);
        partner.enrichmentError = EnrichmentError.fromJSON(o['enrichment_error']);
        partner.leads = o['leads'].map((lead) => Lead.fromJSON(lead));
        return partner;
    }
}

export default Partner;