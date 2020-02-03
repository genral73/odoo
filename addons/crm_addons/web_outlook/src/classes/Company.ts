class Company {
    id: number;
    name: string;
    website: string;
    image: string; // base64
    additionalInfo: Map<string, string>;

    static fromJSON(o: Object): Company {
        var company = Object.assign(new Company(), o);
        company.additionalInfo = new Map<string, string>();
        const additionalInfo = o['additional_information'];
        for (var k in additionalInfo){
            if (additionalInfo.hasOwnProperty(k)) {
                let formattedKey = k.split('_').join(' ');
                formattedKey = formattedKey[0].toUpperCase() + formattedKey.slice(1)
                //company.additionalInfo[formattedKey] = additionalInfo[k].toString()
                company.additionalInfo.set(formattedKey, additionalInfo[k].toString())
                //console.log(company.additionalInfo)
            }
        }
        console.log("ADDITIONAL INFO: ");
        console.log(company.additionalInfo);

        return company;
    }
}

export default Company;