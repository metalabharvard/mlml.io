import { trim } from "./utils";

type Role = {
  role: string;
  position: number;
};

export function cleanListRoles(arr: any[]): Role[] {
  const list: Role[] = [];
  arr.forEach(({ attributes: role }) => {
    const label = trim(role.Role);
    const position = role.Position ?? 99;
    if (label.length) {
      list.push({ role: label, position });
    }
  });
  return list;
}

export function calculateRoleRank(roles: Role[]): number {
  let rank: number = 0.0;
  roles.forEach((role, i) => {
    rank += role.position * Math.pow(10, -i);
  });
  for (let i = roles.length; i < 4; i++) {
    rank += 9 * Math.pow(10, -i);
  }
  return Math.round(rank * 1000) / 1000;
}

export function createRoleString(roles: Role[]): string {
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'conjunction',
  });
  return formatter.format(roles.map(({ role }) => role))
}

export function checkFounder(roles: Role[]): boolean {
  return roles.some(({ role }) => role.toLowerCase().includes('founder'))
}
