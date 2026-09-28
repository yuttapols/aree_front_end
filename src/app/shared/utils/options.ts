import { MenuOption, MenuOptionGroup } from '../../core/models/menu.model';

export function isSelectionValid(groups: MenuOptionGroup[], selected: MenuOption[]): boolean {
  return groups.every((group) => {
    const count = selected.filter((option) => option.groupId === group.id).length;
    return count >= group.minSelect && count <= group.maxSelect;
  });
}

export function defaultSelection(groups: MenuOptionGroup[]): MenuOption[] {
  return groups
    .filter((group) => group.minSelect > 0)
    .flatMap((group) => group.options.slice(0, group.minSelect));
}

export function toggleOption(
  group: MenuOptionGroup,
  option: MenuOption,
  selected: MenuOption[],
): MenuOption[] {
  const inGroup = selected.filter((candidate) => candidate.groupId === group.id);
  const others = selected.filter((candidate) => candidate.groupId !== group.id);
  const isSelected = inGroup.some((candidate) => candidate.id === option.id);
  if (group.maxSelect === 1) {
    if (isSelected && group.minSelect === 0) {
      return others;
    }
    return [...others, option];
  }
  if (isSelected) {
    return [...others, ...inGroup.filter((candidate) => candidate.id !== option.id)];
  }
  if (inGroup.length >= group.maxSelect) {
    return selected;
  }
  return [...selected, option];
}
