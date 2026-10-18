declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  interface SimplePeerOptions {
    initiator?: boolean;
    channelConfig?: Record<string, unknown>;
    channelName?: string;
    config?: RTCConfiguration;
    offerOptions?: RTCOfferOptions;
    answerOptions?: RTCAnswerOptions;
    sdpTransform?: (sdp: string) => string;
    stream?: MediaStream;
    streams?: MediaStream[];
    trickle?: boolean;
    allowHalfTrickle?: boolean;
    objectMode?: boolean;
    wrtc?: Record<string, unknown>;
  }

  interface SimplePeerData {
    type: string;
    sdp?: string;
    candidate?: RTCIceCandidate;
  }

  class Peer extends EventEmitter {
    constructor(opts?: SimplePeerOptions);
    
    signal(data: any): void;
    destroy(err?: Error): void;
    
    readonly connected: boolean;
    readonly destroyed: boolean;
    readonly readable: boolean;
    readonly writable: boolean;
  }

  namespace Peer {
    interface Instance extends Peer {}
  }

  export = Peer;
}