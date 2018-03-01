import React from 'react';
import createReactClass from 'create-react-class';
import styled from 'react-emotion';

import ApiMixin from '../../../mixins/apiMixin';
import UserBadge from '../../../components/userBadge';
import Button from '../../../components/buttons/button';
import DropdownAutoComplete from '../../../components/dropdownAutoComplete';
import DropdownButton from '../../../components/dropdownButton';
import IndicatorStore from '../../../stores/indicatorStore';
import {joinTeam, leaveTeam} from '../../../actionCreators/teams';
import LoadingError from '../../../components/loadingError';
import LoadingIndicator from '../../../components/loadingIndicator';
import OrganizationState from '../../../mixins/organizationState';
import Tooltip from '../../../components/tooltip';
import Panel from '../components/panel';
import PanelHeader from '../components/panelHeader';
import {t} from '../../../locale';

const PanelHeaderContentContainer = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TeamMembers = createReactClass({
  displayName: 'TeamMembers',
  mixins: [ApiMixin, OrganizationState],

  getInitialState() {
    return {
      loading: true,
      error: false,
      teamMemberList: null,
      orgMemberList: null,
    };
  },

  componentWillMount() {
    this.fetchData();
  },

  componentWillReceiveProps(nextProps) {
    let params = this.props.params;
    if (
      nextProps.params.teamId !== params.teamId ||
      nextProps.params.orgId !== params.orgId
    ) {
      this.setState(
        {
          loading: true,
          error: false,
        },
        this.fetchData
      );
    }
  },

  removeMember(member) {
    let {params} = this.props;
    leaveTeam(
      this.api,
      {
        orgId: params.orgId,
        teamId: params.teamId,
        memberId: member.id,
      },
      {
        success: () => {
          this.setState({
            teamMemberList: this.state.teamMemberList.filter(m => {
              return m.id !== member.id;
            }),
          });
          IndicatorStore.add(t('Successfully removed member from team.'), 'success', {
            duration: 2000,
          });
        },
        error: () => {
          IndicatorStore.add(
            t('There was an error while trying to remove a member from the team.'),
            'error',
            {duration: 2000}
          );
        },
      }
    );
  },

  fetchData() {
    let params = this.props.params;

    this.api.request(`/teams/${params.orgId}/${params.teamId}/members/`, {
      success: data => {
        this.setState({
          teamMemberList: data,
          loading: false,
          error: false,
        });
      },
      error: () => {
        this.setState({
          loading: false,
          error: true,
        });
      },
    });

    this.api.request(`/organizations/${params.orgId}/members/`, {
      success: data => {
        this.setState({
          orgMemberList: data,
        });
      },
      error: () => {
        IndicatorStore.add(t('Unable to load organization members.'), 'error', {
          duration: 2000,
        });
      },
    });
  },

  addTeamMember(selection) {
    let params = this.props.params;

    this.setState({
      loading: true,
    });

    joinTeam(
      this.api,
      {
        orgId: params.orgId,
        teamId: params.teamId,
        memberId: selection.value,
      },
      {
        success: () => {
          let orgMember = this.state.orgMemberList.find(member => {
            return member.id === selection.value;
          });
          this.setState({
            loading: false,
            error: false,
            teamMemberList: this.state.teamMemberList.concat([orgMember]),
          });
          IndicatorStore.add(t('Successfully added member to team.'), 'success', {
            duration: 2000,
          });
        },
        error: () => {
          this.setState({
            loading: false,
          });
          IndicatorStore.add(t('Unable to add team member.'), 'error', {duration: 2000});
        },
      }
    );
  },

  renderDropdown(access) {
    if (!access.has('org:write')) {
      return (
        <a
          className="btn btn-default btn-disabled tip pull-right"
          title={t('You do not have enough permission to add new members')}
        >
          <span className="icon-plus" /> {t('Add Member')}
        </a>
      );
    }

    let existingMembers = new Set(this.state.teamMemberList.map(member => member.id));
    let items = [];
    (this.state.orgMemberList || []).forEach(member => {
      if (!existingMembers.has(member.id)) {
        items.push({
          value: member.id,
          label: member.name || member.email,
        });
      }
    });

    return (
      <DropdownAutoComplete items={items} onSelect={this.addTeamMember}>
        {({isOpen, selectedItem}) => (
          <DropdownButton isOpen={isOpen}>
            <span className="icon-plus" /> {t('Add Member')}
          </DropdownButton>
        )}
      </DropdownAutoComplete>
    );
  },

  render() {
    if (this.state.loading) return <LoadingIndicator />;
    else if (this.state.error) return <LoadingError onRetry={this.fetchData} />;

    let {params} = this.props;

    let access = this.getAccess();

    return (
      <div>
        <Panel>
          <PanelHeader>
            <PanelHeaderContentContainer>
              <div>{t('Members')}</div>
              <div style={{textTransform: 'none'}}>{this.renderDropdown(access)}</div>
            </PanelHeaderContentContainer>
          </PanelHeader>
          <table className="table member-list">
            <tbody>
              {this.state.teamMemberList.map((member, i) => {
                return (
                  <tr key={i}>
                    <td className="table-user-info">
                      <UserBadge user={member} orgId={params.orgId} />
                    </td>
                    <td>
                      {access.has('org:write') ? (
                        <Button
                          size="small"
                          onClick={this.removeMember.bind(this, member)}
                        >
                          {t('Remove')}
                        </Button>
                      ) : (
                        <Tooltip
                          title={t("You don't have have permission to remove members")}
                        >
                          <span>
                            <Button size="small" disabled={true}>
                              {t('Remove')}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    );
  },
});

export default TeamMembers;
