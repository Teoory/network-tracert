import { isSameSubnet, parseCIDR } from '../../utils/network';

export class IPv4Protocol {
  isSameSubnet(ip1: string, ip2: string, mask: string): boolean {
    return isSameSubnet(ip1, ip2, mask);
  }

  parsePrefix(cidr: string): { network: string; mask: string } {
    return parseCIDR(cidr);
  }
}
