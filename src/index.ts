import path from 'path';

import { BizGrabber } from './BizGrabber';

const output = path.resolve(__dirname, '..', 'input', '_inn_0902.xlsx');

BizGrabber.grab(output);
