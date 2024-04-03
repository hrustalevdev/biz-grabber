export const isTesting = process.env.NODE_ENV === 'testing';

const gs = process.env.GRAB_SIZE;
export const grabSize: number | undefined =
  !Number.isNaN(Number(gs)) && Number(gs) > 0 && Number(gs) <= 1000 ? Number(gs) : undefined;

export const viaVpn = process.env.VIA_VPN !== 'false';
