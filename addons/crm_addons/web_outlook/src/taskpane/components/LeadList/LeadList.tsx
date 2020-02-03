import * as React from 'react';
import { FocusZone, FocusZoneDirection } from 'office-ui-fabric-react/lib/FocusZone';
import { List } from 'office-ui-fabric-react/lib/List';
import { ITheme, mergeStyleSets, getTheme, getFocusStyle } from 'office-ui-fabric-react/lib/Styling';
import Lead from "../../../classes/Lead";
//import { Link } from "office-ui-fabric-react";
//import { HttpVerb, sendHttpRequest, ContentType } from "../../../utils/httpRequest";
import api from "../../api";

type LeadListProps = {
  leads: Lead[];
  //refresh: Function;
};
type LeadListState = {
};

interface IListGhostingExampleClassObject {
  container: string;
  itemCell: string;
  itemImage: string;
  itemContent: string;
  itemName: string;
  itemIndex: string;
  chevron: string;
  itemButton: string;
}

const theme: ITheme = getTheme();
const { palette, semanticColors, fonts } = theme;

const classNames: IListGhostingExampleClassObject = mergeStyleSets({
  container: {/*
    overflow: 'auto',
    maxHeight: 200*/
  },
  itemCell: [
    getFocusStyle(theme, { inset: -1 }),
    {
      minHeight: 54,
      padding: 10,
      boxSizing: 'border-box',
      borderBottom: `1px solid ${semanticColors.bodyDivider}`,
      display: 'flex',
      cursor: 'pointer',
      selectors: {
        '&:hover': { 
          background: palette.neutralLight,
         },

         '&:hover .LeadListItemName': { 
          whiteSpace: 'normal',
          overflow: 'visible',
          textOverflow: '-',
          overflowWrap: 'break-word'
         },
/*
         '&:hover .LeadListItemButton': {
           display: 'inline'
         }
*/
      }
    }
  ],
  itemImage: {
    flexShrink: 0
  },
  itemContent: {
    /*marginLeft: 10,*/
    overflow: 'hidden',
    flexGrow: 1
  },
  itemName: [
    fonts.medium,
    {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  ],
  itemButton: {
    display: 'none',
    marginLeft: '1em'
  },
  itemIndex: {
    fontSize: fonts.small.fontSize,
    color: palette.neutralTertiary,
    /*marginBottom: 10*/
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 10,
    color: palette.neutralTertiary,
    fontSize: fonts.large.fontSize,
    flexShrink: 0
  }
});

export class LeadList extends React.Component<LeadListProps, LeadListState> {
  constructor(props) {
    super(props);
    this.state = { };
  }
  /*
  deleteLead = (id: number) => {

    let leadData = {
      id: id,
    };
    const token = localStorage.getItem("token");
    const self = this;
    sendHttpRequest(HttpVerb.POST, api.baseURL + api.deleteLead, ContentType.Json, token, leadData)
      .then(function(response) {
        console.log(response);
        const parsed = JSON.parse(response);
        // Can't for example delete the same item twice. The delete method was
        // designed so that if several delete requests for the same item are
        // sent, then the server doesn't bother retrieving the list of leads 
        // several times. It just send 'success': False when the item has
        // already been deleted
        if (parsed.result.success) {
          self.props.refresh(parsed)
        }
      })
      .catch(function(error) {
        console.log(error);
      });
    //self.props.refresh();
  };
  */
  private _leadClick = (leadId: number) => {
    window.open(api.baseURL + "/web#action=crm.crm_lead_action_pipeline&view_type=form&id=" + leadId,"_blank")
  }

  public render(): JSX.Element {
    return (
      <FocusZone direction={FocusZoneDirection.vertical}>
        <div className={classNames.container} data-is-scrollable={true}>
          <List items={this.props.leads} onRenderCell={this._onRenderCell} />
        </div>
      </FocusZone>
    );
  }

  /*
    <Link className={`LeadListItemButton ${classNames.itemButton}`}>Edit</Link>
    <Link className={`LeadListItemButton ${classNames.itemButton}`} onClick={() => {this.deleteLead(item.id);}}>Delete</Link>
  */

  private _onRenderCell = (item: Lead): JSX.Element => {
    return (
      <div className={classNames.itemCell} data-is-focusable={true} onClick={()=>this._leadClick(item.id)}>
        <div className={classNames.itemContent}>
          <div className={`LeadListItemName ${classNames.itemName}`}>{item.name}</div>
          <div className={classNames.itemIndex}>{item.getExpectedRevenueWithCurrency()}</div>
      </div>
      </div>
    );
  }
}
