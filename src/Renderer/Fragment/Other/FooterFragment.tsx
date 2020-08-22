import {shell} from 'electron';
import React from 'react';
import {StreamEvent} from '../../Event/StreamEvent';
import {SystemStreamEvent} from '../../Event/SystemStreamEvent';
import {StreamRepo} from '../../Repository/StreamRepo';
import {SystemStreamRepo} from '../../Repository/SystemStreamRepo';
import {DateUtil} from '../../Util/DateUtil';
import {VersionEvent} from '../../Event/VersionEvent';
import {BaseStreamEntity, StreamEntity, SystemStreamEntity} from '../../Type/StreamEntity';
import {RemoteVersionEntity} from '../../Type/RemoteVersionEntity';
import styled from 'styled-components';
import {View} from '../../Component/Core/View';
import {ClickView} from '../../Component/Core/ClickView';
import {Icon} from '../../Component/Core/Icon';
import {Text} from '../../Component/Core/Text';
import {font, fontWeight, iconFont, space} from '../../Style/layout';
import {appTheme} from '../../Style/appTheme';
import {color} from '../../Style/color';

type Props = {
}

type State = {
  lastStream: BaseStreamEntity;
  lastDate: Date;
  newVersion: RemoteVersionEntity;
}

export class FooterFragment extends React.Component<Props, State> {
  state: State = {
    lastStream: null,
    lastDate: null,
    newVersion: null,
  };

  componentDidMount() {
    StreamEvent.onUpdateStreamIssues(this, (streamId) => this.updateTime(streamId));
    VersionEvent.onNewVersion(this, (newVersion) => this.setState({newVersion}));
  }

  componentWillUnmount(): void {
    SystemStreamEvent.offAll(this);
    StreamEvent.offAll(this);
  }

  private async updateTime(streamId: number) {
    let stream: StreamEntity | SystemStreamEntity;

    if (SystemStreamRepo.isSystemStreamId(streamId)) {
      const res = await SystemStreamRepo.getSystemStream(streamId);
      if (res.error) return console.error(res.error);
      stream = res.systemStream;
    } else {
      const res = await StreamRepo.getStream(streamId);
      if (res.error) return console.error(res.error);
      stream = res.stream;
    }

    this.setState({lastStream: stream, lastDate: new Date()});
  }

  private handleNewVersion() {
    shell.openExternal(this.state.newVersion.url);
  }

  render() {
    let lastStreamMessage;
    let hoverMessage;
    if (this.state.lastStream) {
      const lastDate = DateUtil.localToString(this.state.lastDate);
      lastStreamMessage = lastDate.split(' ')[1];
      hoverMessage = `"${this.state.lastStream.name}" stream updated at ${lastDate}`;
    }

    const newVersion = this.state.newVersion ? 'New Version' : '';

    return (
      <Root>
        <Icon name='cloud-download-outline' size={iconFont.small}/>
        <UpdateText title={hoverMessage}>
          {lastStreamMessage}
        </UpdateText>
        <View style={{flex: 1}}/>
        <ClickView onClick={() => this.handleNewVersion()} style={{display: newVersion ? null : 'none'}}>
          <NewVersionText>{newVersion}</NewVersionText>
        </ClickView>
      </Root>
    );
  }
}

const Root = styled(View)`
  flex-direction: row;
  padding: 0 ${space.medium}px ${space.small}px;
  align-items: center;
`;

const UpdateText = styled(Text)`
  padding-top: 1px;
  padding-left: ${space.small}px;
  font-size: ${font.small}px;
  color: ${() => appTheme().textSoftColor};
`;

const NewVersionText = styled(Text)`
  font-size: ${font.small}px;
  color: ${color.white};
  background: ${color.blue};
  border-radius: 4px;
  font-weight: ${fontWeight.bold};
  padding: ${space.tiny}px ${space.small2}px;
`;
