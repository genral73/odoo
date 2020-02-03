import * as React from "react";

import "./Main.css";

import { /*MessageBarButton,*/ Link, MessageBar, MessageBarType} from 'office-ui-fabric-react';
import { PrimaryButton} from "office-ui-fabric-react";
import { Separator } from "office-ui-fabric-react/lib/Separator";

import Partner from "../Partner/Partner";
//import LeadForm from "../LeadForm/LeadForm";
import Burger from "../Burger/Burger";
import EmailLogForm from "../EmailLogForm/EmailLogForm";

import { HttpVerb, sendHttpRequest, ContentType } from "../../../utils/httpRequest";
import api from "../../api";

import PartnerData from "../../../classes/Partner";
import Lead from "../../../classes/Lead";
import EnrichmentError, {EnrichmentErrorType} from '../../../classes/EnrichmentError';

enum Page {
  Main,
  //LeadForm,
  EmailLogForm
}

type MainProps = {
  logout: Function
};
type MainState = {
  pageDisplayed: Page,
  partners: PartnerData[];
  leads: Lead[];
  showPartnerCreatedMessage: boolean;
  showEnrichmentErrorMessage: boolean;
  //partnerCreatedMessageClass: string;
  //enrichmentErrorMessageClass: string;
  enrichmentError: EnrichmentError,
  partnerCreated: Boolean,
};
class Main extends React.Component<MainProps, MainState> {
  constructor(props) {
    super(props);
    this.state = {
      pageDisplayed: Page.Main,
      partners: [new PartnerData()],
      leads: [],
      showPartnerCreatedMessage: false,
      showEnrichmentErrorMessage: false,
      enrichmentError: new EnrichmentError(),
      partnerCreated: false,
      //partnerCreatedMessageClass: "message-bar-show",
      //enrichmentErrorMessageClass: "message-bar-show"
    };
  }

  componentDidMount() {
    console.log("Main > ComponentDidMount");
    const token = localStorage.getItem("token");
    const self = this;
    if (token) {
      const email = Office.context.mailbox.item.from.emailAddress; // "fhu@odoo.com"
      const displayName = Office.context.mailbox.item.from.displayName;
      sendHttpRequest(HttpVerb.POST, api.baseURL + api.getPartner, ContentType.Json, token, {
        email: email,
        name: displayName
      }).then(function(response) {
        const parsed = JSON.parse(response);
        console.log("PARSED RESULT:");
        console.log(parsed.result);
        if (!parsed.result['authorized']){
          console.log("NOT AUTHORIZED");
          self.loginAgain();
          return;
        }
        var partners = parsed.result.partners.map((partnerJSON) => PartnerData.fromJSON(partnerJSON));
        self.setState({
          partners: partners,
          enrichmentError: EnrichmentError.fromJSON(parsed.result['enrichment_error']),
          partnerCreated: parsed.result['created'],
          showEnrichmentErrorMessage: true,
          showPartnerCreatedMessage: true
        });
        //self.refreshLeads();
      }).catch(function(error) {
        console.log("Error catched: " + error);
        // Most likely the error = 0
        // And most likely an authentication error occured
        // TODO ask why I can't retrieve a more precise err message from Odoo
        self.loginAgain();
      });
    }
  }

  loginAgain = () => {
    console.log("LOGIN AGAIn");
    this.props.logout('Please login again');
  }

/*<PrimaryButton className="full-width" text="Create Opportunity" />

        <Separator>New Opportunity</Separator>
        <LeadForm partnerId={this.state.partner.id}></LeadForm>
        <Separator></Separator>
        <Link onClick={this.disconnect}>Logout</Link>
*/

  //goToLeadForm = () => {
  //  window.open(api.baseURL + api.redirectCreateLead + '?partner_id=' + this.state.partners[0].id,"_blank");
    /*this.setState({
      pageDisplayed: Page.LeadForm
    });*/
  //}

  goToEmailLogForm = () => {
    this.setState({
      pageDisplayed: Page.EmailLogForm
    });
  }

  goToMainPage = (/*refreshLeads: boolean*/) => {
    this.setState({
      pageDisplayed: Page.Main
    });
    /*
    if (refreshLeads) {
      // Leave enough time for the lead to be created, if it's not enough the 
      // user will click on the refresh button.
      this.refreshLeadsDefered();
    }*/
  }

  refreshLeadsDefered = () => {
    setTimeout(this.refreshLeads, 1000);
  }

  refreshLeadsFromResponse = (parsedResponse: object) => {
    const leads = parsedResponse['result'].leads.map(function(leadJSON) {return Lead.fromJSON(leadJSON)})
    this.setState({
      leads: leads
    });
  }

  refreshLeads = () => {
    const token = localStorage.getItem("token");
    const self = this;
    console.log("Refresh leads");
    sendHttpRequest(HttpVerb.POST, api.baseURL + api.getLeads, ContentType.Json, token, {partner_id: this.state.partners[0].id})
      .then(function(response) {
        const parsed = JSON.parse(response);
        self.refreshLeadsFromResponse(parsed);
/*
        console.log("PARTNER: " + self.state.partner);
        let partner = {
          ...self.state.partner
        }
        partner.leads = leads
        console.log(partner)
        self.setState({
          partner: partner
        });
        console.log(self.state)*/
        /*
        self.setState({
          partner: {
            ...self.state.partner,
            leads: leads
          }
        });*/
      })
  }

  _hideEnrichmentErrorMessage = () => {
    this.setState({
      //enrichmentErrorMessageClass: 'message-bar-hide'
      showEnrichmentErrorMessage: false
    })
  }

  _hidePartnerCreatedMessage = () => {
    this.setState({
      showPartnerCreatedMessage: false
    })
  }

  _getMessageBars = () => {
    //let messages = [];
    const {type, info} = this.state.enrichmentError;
    let bars = [];
    if (this.state.showPartnerCreatedMessage && this.state.partnerCreated) {
      bars.push(<MessageBar messageBarType={MessageBarType.success} onDismiss={this._hidePartnerCreatedMessage}>Partner created</MessageBar>);
      //setTimeout(this._hidePartnerCreatedMessage, 3000);
    }
    
    if (this.state.showEnrichmentErrorMessage) {
      switch (type) {
        case EnrichmentErrorType.None:
          bars.push(<MessageBar messageBarType={MessageBarType.success} onDismiss={this._hideEnrichmentErrorMessage}>Partner autocompleted</MessageBar>);
          //setTimeout(this._hideEnrichmentErrorMessage, 3500);
          break;
        case EnrichmentErrorType.NoData:
          bars.push(<MessageBar messageBarType={MessageBarType.info} onDismiss={this._hideEnrichmentErrorMessage}>Could not autocomplete: no data found</MessageBar>);
          break;
        case EnrichmentErrorType.InsufficientCredit:
          bars.push(<MessageBar messageBarType={MessageBarType.error} onDismiss={this._hideEnrichmentErrorMessage}>
            Insufficient credit to autocomplete. 
              <Link href={info} target="_blank">
                  Buy more credit
              </Link>
            </MessageBar>);
          break;
        case EnrichmentErrorType.Other:
          bars.push(<MessageBar messageBarType={MessageBarType.error} onDismiss={this._hideEnrichmentErrorMessage}>Could not autocomplete. Error: {info}</MessageBar>);
          break;
      }
    }

    return bars;
  }

  render() {
    //console.log('Enrichment error type: ' + this.state.partner.enrichmentError.type);
  //console.log('Enrichment error info: ' + this.state.partner.enrichmentError.info);
    switch(this.state.pageDisplayed)
    {
      case Page.Main:
        const burgerEntries = [{"Title": "Logout", "OnClick": this.props.logout}];
        return (
          <div className="page">
            <Burger entries={burgerEntries}></Burger>
            <div className='message-bars'>
              {this._getMessageBars()}
            </div>
            <PrimaryButton className="form-line-compact full-width" text="Add Mail to Chatter" onClick={this.goToEmailLogForm} />
            <Separator />
            {this.state.partners.map((p) => (<Partner key={p.id} data={p} defaultExpanded={this.state.partners.length == 1}></Partner>))}

          </div>
        );
      //case Page.LeadForm:
      // Case no longer used, now redirected into Odoo for lead creation
        //return <LeadForm partnerId={this.state.partners[0].id} goToMainPage={this.goToMainPage} />;
      case Page.EmailLogForm:
        return <EmailLogForm partners={this.state.partners} goToMainPage={this.goToMainPage} loginAgain={this.loginAgain} />;
    }
  }
}


export default Main;
