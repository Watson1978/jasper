import React from 'react';
import {StreamEntity} from '../../../Library/Type/StreamEntity';
import {ColorUtil} from '../../../Library/Util/ColorUtil';
import {Modal} from '../../../Library/View/Modal';
import {Text} from '../../../Library/View/Text';
import {TextInput} from '../../../Library/View/TextInput';
import {Icon} from '../../../Library/View/Icon';
import {space} from '../../../Library/Style/layout';
import {Link} from '../../../Library/View/Link';
import {colorPalette} from '../../../Library/Style/color';
import {View} from '../../../Library/View/View';
import {CheckBox} from '../../../Library/View/CheckBox';
import {Button} from '../../../Library/View/Button';
import styled from 'styled-components';
import {ClickView} from '../../../Library/View/ClickView';
import {StreamRepo} from '../../../Repository/StreamRepo';
import {appTheme} from '../../../Library/Style/appTheme';
import {IconNameType} from '../../../Library/Type/IconNameType';
import {SampleIconNames} from '../SampleIconNames';
import {DocsUtil} from '../../../Library/Util/DocsUtil';

type Props = {
  show: boolean;
  onClose: (edited: boolean, streamId?: number, filterStreamId?: number) => void;
  editingUserStream: StreamEntity | null;
  editingFilterStream: StreamEntity | null;
  initialFilter: string;
}

type State = {
  name: string;
  filter: string;
  color: string;
  notification: boolean;
  iconName: IconNameType;
  showDetail: boolean;
  errorName: boolean;
  errorColor: boolean,
  errorIconName: boolean;
}

export class FilterStreamEditorFragment extends React.Component<Props, State> {
  state: State = {
    name: '',
    filter: '',
    color: '',
    notification: true,
    iconName: 'file-tree',
    showDetail: false,
    errorName: false,
    errorColor: false,
    errorIconName: false,
  }

  componentDidUpdate(prevProps: Readonly<Props>, _prevState: Readonly<State>, _snapshot?: any) {
    // 表示されたときに初期化する
    if (!prevProps.show && this.props.show) {
      const editingFilterStream = this.props.editingFilterStream;
      if (editingFilterStream) {
        this.setState({
          name: editingFilterStream.name,
          filter: editingFilterStream.userFilter,
          color: editingFilterStream.color || this.props.editingUserStream?.color || appTheme().icon.normal,
          notification: !!editingFilterStream.notification,
          iconName: editingFilterStream.iconName,
          showDetail: false,
          errorName: false,
          errorColor: false,
          errorIconName: false,
        });
      } else {
        this.setState({
          name: '',
          filter: this.props.initialFilter || '',
          color: this.props.editingUserStream?.color || appTheme().icon.normal,
          notification: !!(this.props.editingUserStream?.notification ?? 1),
          iconName: 'file-tree',
          showDetail: false,
          errorName: false,
          errorColor: false,
          errorIconName: false,
        });
      }
    }
  }

  private async handleEdit() {
    const name = this.state.name?.trim();
    const filter = this.state.filter?.trim();
    const color = this.state.color?.trim();
    const notification = this.state.notification ? 1 : 0;
    const iconName = this.state.iconName?.trim() as IconNameType;

    this.setState({errorName: false, errorColor: false, errorIconName: false});
    if (!name) return this.setState({errorName: true});
    if (!ColorUtil.isValid(color)) return this.setState({errorColor: true});
    if (!iconName) return this.setState({errorIconName: true});

    if (this.props.editingFilterStream) {
      const {error} = await StreamRepo.updateStream(this.props.editingFilterStream.id, name, [], filter, notification, color, this.props.editingFilterStream.enabled, iconName);
      if (error) return console.error(error);
      this.props.onClose(true, this.props.editingUserStream?.id, this.props.editingFilterStream.id);
    } else {
      const {error, stream} = await StreamRepo.createStream('FilterStream', this.props.editingUserStream?.id ?? null, name, [], filter, notification, color, iconName);
      if (error) return console.error(error);
      this.props.onClose(true, this.props.editingUserStream?.id, stream.id);
    }
  }

  private async handleCancel() {
    this.props.onClose(false);
  }

  render() {
    return (
      <Modal show={this.props.show} onClose={() => this.handleCancel()} style={{width: 500}} fixedTopPosition={true}>
        {this.renderParentStream()}
        {this.renderName()}
        {this.renderFilter()}
        {this.renderDetails()}
        {this.renderButtons()}
      </Modal>
    );
  }

  private renderParentStream() {
    if (!this.props.editingUserStream) return;

    const queries = this.props.editingUserStream.queries;
    const queryViews = queries.map((query, index) => {
      return <TextInput value={query} onChange={() => null} key={index} readOnly={true} style={{marginBottom: space.small}}/>;
    });

    return (
      <React.Fragment>
        <Text>Stream: {this.props.editingUserStream.name}</Text>
        {queryViews}
      </React.Fragment>
    );
  }

  private renderName() {
    return (
      <React.Fragment>
        <Space/>
        <Text>Name</Text>
        <TextInput
          value={this.state.name}
          onChange={t => this.setState({name: t, errorName: !t})}
          placeholder='filter stream name'
          hasError={this.state.errorName}
        />
      </React.Fragment>
    );
  }

  private renderFilter() {
    return (
      <React.Fragment>
        <Space/>
        <Row>
          <Text>Filter</Text>
          <Link url={DocsUtil.getFilterStreamURL()} style={{marginLeft: space.medium}}>help</Link>
        </Row>
        <TextInput
          value={this.state.filter}
          onChange={t => this.setState({filter: t})}
          placeholder='is:pr author:octocat'
        />
      </React.Fragment>
    );
  }

  private renderDetails() {
    if (!this.state.showDetail) return;

    return (
      <Details>
        {this.renderColor()}
        {this.renderIcon()}
        {this.renderNotification()}
      </Details>
    );
  }

  private renderColor() {
    const colorViews = colorPalette.map((color, index) => {
      return (
        <ColorCell
          key={index}
          style={{background: color, marginLeft: space.small}}
          onClick={() => this.setState({color})}
        />
      );
    });

    return (
      <React.Fragment>
        <Space/>
        <Row>
          <Text>Color</Text>
          <View style={{flex: 1}}/>
          {colorViews}
        </Row>
        <TextInput value={this.state.color} onChange={t => this.setState({color: t})} hasError={this.state.errorColor}/>
      </React.Fragment>
    );
  }

  private renderIcon() {
    const iconNameViews = SampleIconNames.map(iconName => {
      return (
        <IconClickView key={iconName} onClick={() => this.setState({iconName})}>
          <Icon name={iconName} color={this.state.color}/>
        </IconClickView>
      );
    });

    return (
      <React.Fragment>
        <Space/>
        <Row>
          <Text>Icon</Text>
          <Icon name={this.state.iconName} color={this.state.color} style={{marginLeft: space.small}}/>
          <View style={{flex: 1}}/>
          {iconNameViews}
          <Link url='https://materialdesignicons.com/' style={{marginLeft: space.small}}>All Icons</Link>
        </Row>
        <TextInput value={this.state.iconName} onChange={t => this.setState({iconName: t as IconNameType})} hasError={this.state.errorIconName}/>
      </React.Fragment>
    );
  }

  private renderNotification() {
    return (
      <React.Fragment>
        <Space/>
        <CheckBox
          checked={this.state.notification}
          onChange={c => this.setState({notification: c})}
          label='Notification'
        />
      </React.Fragment>
    );
  }

  private renderButtons() {
    return (
      <React.Fragment>
        <Space/>
        <Buttons>
          <Button onClick={() => this.setState({showDetail: !this.state.showDetail})}>Show Details</Button>
          <View style={{flex: 1}}/>
          <Button onClick={() => this.handleCancel()}>Cancel</Button>
          <Button onClick={() => this.handleEdit()} type='primary' style={{marginLeft: space.medium}}>OK</Button>
        </Buttons>
      </React.Fragment>
    );
  }
}

const Space = styled(View)`
  height: ${space.large}px;
`;

const Row = styled(View)`
  flex-direction: row;
  align-items: center;
`;

const Buttons = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const ColorCell = styled(ClickView)`
  width: 16px;
  height: 16px;
  border-radius: 100%;
`;

const IconClickView = styled(ClickView)`
  margin-left: ${space.small}px;
`;

const Details = styled(View)`
  padding: ${space.medium}px 0;
`;
