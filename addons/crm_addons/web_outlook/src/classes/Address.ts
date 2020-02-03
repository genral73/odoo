class Address {
    number: string;
    street: string;
    city: string;
    zip: string;
    country: string;

    getLines(): string[] {
        let firstLine = [this.number || "", this.street || ""].join(" ").trim();
        let secondLine = [this.city || "", this.zip || ""].join(" ").trim();

        let lines = [];
        if (firstLine)
            lines.push(firstLine)
        if (secondLine)
            lines.push(secondLine)
        if (this.country)
            lines.push(this.country)

        return lines;
    }

    static fromJSON(o: Object): Address {
        var address = Object.assign(new Address(), o);
        return address;
    }
}

export default Address;