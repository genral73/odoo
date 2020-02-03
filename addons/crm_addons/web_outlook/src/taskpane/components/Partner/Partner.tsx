import * as React from "react";
import { IPersonaSharedProps, Persona, PersonaSize } from "office-ui-fabric-react/lib/Persona";
//import { Icon } from "office-ui-fabric-react";
import { Label, ILabelStyles } from "office-ui-fabric-react/lib/Label";
import { PivotItem  , Pivot } from "office-ui-fabric-react/lib/Pivot";
import { IStyleSet } from "office-ui-fabric-react/lib/Styling";
import InfoBubble from "../InfoBubble/InfoBubble"
import PartnerData from "../../../classes/Partner";

import { Separator } from "office-ui-fabric-react/lib/Separator";
import { PrimaryButton} from "office-ui-fabric-react";
import {LeadList} from "../LeadList/LeadList";

import api from "../../api";

const labelStyles: Partial<IStyleSet<ILabelStyles>> = {
  root: { marginTop: 10 }
};

type PartnerProps = {
  data: PartnerData;
  //expand: Function;
  defaultExpanded: boolean;
  //leads: Lead[]
};
type PartnerState = {
  expanded: boolean;
};

class Partner extends React.Component<PartnerProps, PartnerState> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      expanded: props.defaultExpanded
    };
  }

  goToLeadForm = () => {
    window.open(api.baseURL + api.redirectCreateLead + '?partner_id=' + this.props.data.id,"_blank");
  }

  render() {
    const {phone, mobile, email} = this.props.data;
    const personaData: IPersonaSharedProps = {
      imageUrl: this.props.data.image ? "data:image;base64, " + this.props.data.image : null,
      imageInitials: this.props.data.getInitials(),
      text: this.props.data.name,
      secondaryText: this.props.data.title,
      tertiaryText: this.props.data.company.name,
      className: 'clickable'
    };
    console.log(this.props.data.address.getLines());
    const addressLines = this.props.data.address.getLines().map((item) => <div>{item}</div>);
    console.log("Address lines: " + addressLines);
    //let phoneElem = null;
    //if (phone)
    //  phoneElem = <div><Label styles={labelStyles}>Phone</Label> {phone}</div>
    
    /*
            <Separator></Separator>
        <Label>Opportunities</Label>
        <LeadList leads={this.props.leads} />
        <PrimaryButton className="form-line full-width" text="Create Opportunity" onClick={this.goToLeadForm} />
        <PrimaryButton className="form-line-compact full-width" text="Add Mail to Chatter" onClick={this.goToEmailLogForm} />
    */

    return (
      <div>
        <div>
        <Persona {...personaData} size={PersonaSize.size56} onClick={() => this.setState({expanded: !this.state.expanded})} />
        </div>
        {this.state.expanded ? (
        <div>
          <Pivot>
            <PivotItem itemIcon="ContactCard">
              {phone ? <div><Label styles={labelStyles}>Phone</Label> {phone}</div> : null}
              {mobile ? <div><Label styles={labelStyles}>Mobile</Label> {mobile}</div> : null}
              {email ? <div><Label styles={labelStyles}>Email</Label> {email}</div> : null}
            </PivotItem>
            <PivotItem itemIcon="HomeSolid">
              {addressLines.length > 0 ? <div><Label styles={labelStyles}>Company Address</Label> {addressLines}</div> : null}
              <InfoBubble info={this.props.data.company.additionalInfo}></InfoBubble>
            </PivotItem>
          </Pivot>
          <Separator></Separator>
          <Label>Opportunities</Label>
          <LeadList leads={this.props.data.leads} />
          <PrimaryButton className="form-line full-width" text="Create Opportunity" onClick={this.goToLeadForm} />

        </div> 
        ): null}


        <Separator></Separator>
      </div>
    );
  }
}

export default Partner;
