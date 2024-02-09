import path from 'path';

import { BizGrabber } from './BizGrabber';
import { isTesting } from './lib/env';

const input =
  isTesting ?
    path.resolve(__dirname, '..', 'input', 'test')
  : path.resolve(__dirname, '..', 'input');

BizGrabber.grab(input);
