import * as React from "react";
import { MessageBar, MessageBarType} from 'office-ui-fabric-react';
import { HttpVerb, sendHttpRequest, ContentType } from "../../../utils/httpRequest";
import api from "../../api";
import PartnerData from "../../../classes/Partner";
//import Lead from "../../../classes/Lead";
import { Link, PrimaryButton } from "office-ui-fabric-react";
import { Text } from 'office-ui-fabric-react/lib/Text';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';

type EmailLogFormProps = {
  partners: PartnerData[],
  goToMainPage: Function,
  loginAgain: Function
};
type EmailLogFormState = {
    addButtonDisabled: boolean,
    selectedPartnerIds: number[],
    selectedLeadIds: number[],
    logSuccess: boolean,
    logErrors: []
 };
class LeadComponent extends React.Component<EmailLogFormProps, EmailLogFormState> {
  constructor(props) {
    super(props);
    this.state = { 
        addButtonDisabled: true,
        selectedLeadIds: [],
        selectedPartnerIds: [],
        logSuccess: null,
        logErrors: []
    };
  }

  back = () => {
    this.props.goToMainPage();
  }

  addToChatter = () => {
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Html, (result) => {
        console.log('BODY:' + result.value)
        //TODO: error management from result
        let data = {
            partner_ids: this.state.selectedPartnerIds,
            lead_ids: this.state.selectedLeadIds,
            message: result.value,
        };
        const token = localStorage.getItem("token");
        const self = this;
        sendHttpRequest(HttpVerb.POST, api.baseURL + api.logMail, ContentType.Json, token, data)
        .then(function(response) {
            //console.log(response);
            const parsedResult = JSON.parse(response).result;
            console.log("EMAIL LOG FORM parsedResult:");
            console.log(parsedResult);
            if (!parsedResult['authorized']){
                console.log("NOT AUTHORIZED");
                self.props.loginAgain();
                return;
            }
            self.setState({
                logSuccess: parsedResult.success,
                logErrors: parsedResult.errors
            });
        })
        .catch(function() {
            self.setState({
                logSuccess: false
            })

            self.props.loginAgain();
        });
        //self.props.goToMainPage();
    })

  };

  _onContactCheckChange = (id: number, isChecked: boolean) => {
    let newSelectedPartnerIds: number[];
    if (isChecked) {
        newSelectedPartnerIds = this.state.selectedPartnerIds.concat(id);
    } else {
        newSelectedPartnerIds = this.state.selectedPartnerIds.filter((item) => item != id);
    }

    this.setState({
        selectedPartnerIds: newSelectedPartnerIds,
        addButtonDisabled: !newSelectedPartnerIds.length && !this.state.selectedLeadIds.length
    });
  }

  _onLeadCheckChange = (id: number, isChecked: boolean) => {
    let newSelectedLeadIds: number[];
    if (isChecked) {
        newSelectedLeadIds = this.state.selectedLeadIds.concat(id);
    } else {
        newSelectedLeadIds = this.state.selectedLeadIds.filter((item) => item != id);
    }

    this.setState({
        selectedLeadIds: newSelectedLeadIds,
        addButtonDisabled: !newSelectedLeadIds.length && !this.state.selectedPartnerIds.length
    });
  }


  render() {
    let contactBlock = [<Text variant="small" className='form-line' block>CONTACTS</Text>];    
    let leadBlock = [<Text variant="small" className='form-line' block>OPPORTUNITIES</Text>];

    // Given that partners are sharing the same email address, they should be from the same company.
    // But who knows...
    let processedCompanies = []

    this.props.partners.forEach((partner) => {
        contactBlock.push(<Checkbox 
        className='form-line-compact'
        label={partner.name}
        onChange={(_, isChecked: boolean) => this._onContactCheckChange(partner.id, isChecked)} />);
    
        if (partner.company.id && !processedCompanies.includes(partner.company.id)) {
            processedCompanies.push(partner.company.id);
            contactBlock.push(<Checkbox
                className='form-line-compact'
                label={partner.company.name}
                onChange={(_, isChecked: boolean) => this._onContactCheckChange(partner.company.id, isChecked)}/>)
        }

        partner.leads.forEach((lead) => {
            leadBlock.push(<Checkbox
                className='form-line-compact'
                label={lead.name}
                onChange={(_, isChecked: boolean) => this._onLeadCheckChange(lead.id, isChecked)}/>)
        })
    });

    const {logSuccess, logErrors} = this.state;
    let errorBlock = [];
    if (logSuccess != null){
        if (logSuccess) {
            errorBlock.push(<MessageBar messageBarType={MessageBarType.success}>Mail succesfully logged</MessageBar>)
        } else if (logErrors.length == 0) {
            errorBlock.push(<MessageBar messageBarType={MessageBarType.error}>Error while logging the mail</MessageBar>)
        } else {
            errorBlock = logErrors.map((e) => <MessageBar messageBarType={MessageBarType.error}>Error while logging to "{e['name']}"</MessageBar>)
        }    
    }

    return (
        <div className="page">
            <div className='message-bars'>
                {errorBlock}
            </div>
            <Text variant="large" block>Select records</Text>
            {contactBlock}
            {leadBlock.length > 1 ? leadBlock : null}
            <PrimaryButton
                className="form-line full-width"
                text="Add to Chatter"
          disabled={this.state.addButtonDisabled}
          onClick={this.addToChatter}
        />
        <Link onClick={this.back}>Back</Link>
      </div>
    );
  }
}

export default LeadComponent;