import * as React from "react";
import { TextField } from "office-ui-fabric-react/lib/TextField";
import { Rating, RatingSize } from "office-ui-fabric-react/lib/Rating";
import { Link, PrimaryButton } from "office-ui-fabric-react";
import { HttpVerb, sendHttpRequest, ContentType } from "../../../utils/httpRequest";
import api from "../../api";
type LeadFormProps = {
  partnerId: number;
  goToMainPage: Function;
};
type LeadFormState = {
  isLoading: boolean;
  leadName: string;
  priority: number;
  expectedRevenue: string;
  createButtonEnabled: boolean;
};
class Login extends React.Component<LeadFormProps, LeadFormState> {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      priority: 0,
      leadName: "",
      expectedRevenue: "",
      createButtonEnabled: false
    };
  }

  createLead = () => {
    if (!this._isFormValid(this.state.leadName, this.state.expectedRevenue)) {
      return;
    }

    let leadData = {
      partner_id: this.props.partnerId,
      name: this.state.leadName,
      expected_revenue: Number(this.state.expectedRevenue),
      priority: this.state.priority.toString()
    };
    const token = localStorage.getItem("token");
    const self = this;
    sendHttpRequest(HttpVerb.POST, api.baseURL + api.createLead, ContentType.Json, token, leadData)
      .then(function(response) {
        console.log(response);
        /*
        self.setState({
          leadName: "",
          expectedRevenue: "",
          priority: 0
        });*/
      })
      .catch(function(error) {
        self.setState({
          // TODO
          leadName: error
        });
      });
    self.props.goToMainPage(true);
  };

  back = () => {
    this.props.goToMainPage(false);
  }

  private _isFormValid = (leadName: string, expectedRevenue: string): boolean => {
    console.log(expectedRevenue);
    if (!leadName) {
      return false;
    }
    if (expectedRevenue && Number.isNaN(Number(expectedRevenue))) {
      return false;
    }
    return true;
  };

  private _onPriorityChange = (_: React.FocusEvent<HTMLElement>, priority: number): void => {
    this.setState({ priority: priority });
  };

  private _onLeadTitleChange = (
    _: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
    newValue?: string
  ): void => {
    this.setState({
      leadName: newValue,
      createButtonEnabled: this._isFormValid(newValue, this.state.expectedRevenue)
    });
  };

  private _onExpectedRevenueChange = (
    _: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
    newValue?: string
  ): void => {
    if (!Number.isNaN(Number(newValue))) {
      this.setState({
        expectedRevenue: newValue,
        createButtonEnabled: this._isFormValid(this.state.leadName, newValue)
      });
    }
  };

  render() {
    return (
      <div className="page">
        <TextField
          label="Opportunity Title"
          required
          value={this.state.leadName}
          onChange={this._onLeadTitleChange} />
        <TextField
          label="Expected Revenue"
          value={this.state.expectedRevenue}
          onChange={this._onExpectedRevenueChange}
        />
        <Rating
          label="Priority"
          min={0}
          max={3}
          size={RatingSize.Large}
          rating={this.state.priority}
          onChange={this._onPriorityChange}
        />
        <PrimaryButton
          className="full-width"
          text="Create Opportunity"
          disabled={!this.state.createButtonEnabled}
          onClick={this.createLead}
        />
        <Link onClick={this.back}>Back</Link>
      </div>
    );
  }
}

export default Login;
