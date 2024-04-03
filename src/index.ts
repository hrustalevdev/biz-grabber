import 'dotenv/config';
import path from 'path';

import { BizGrabber } from './BizGrabber';
import { isTesting, grabSize, viaVpn } from './lib/env';

const input =
  isTesting ?
    path.resolve(__dirname, '..', 'input', 'test')
  : path.resolve(__dirname, '..', 'input');

const output =
  isTesting ?
    path.resolve(__dirname, '..', 'output', 'test')
  : path.resolve(__dirname, '..', 'output');

BizGrabber.grab({ input, output, grabSize, viaVpn });
