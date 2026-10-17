import { OrderItemOptionResponse } from '../../core/api/models/order.model';
import { MenuItem, MenuOption, MenuOptionGroup } from '../../core/models/menu.model';

export function isSelectionValid(groups: MenuOptionGroup[], selected: MenuOption[]): boolean {
  const ids = selected.map((option) => option.id);
  if (new Set(ids).size !== ids.length || selected.some((option) => !option.available)) {
    return false;
  }
  return groups.every((group) => {
    const count = selected.filter((option) => option.groupId === group.id).length;
    return count >= group.minSelect && count <= group.maxSelect;
  });
}

export function resolveOrderOptions(
  item: MenuItem,
  ordered: OrderItemOptionResponse[],
): (MenuOption | undefined)[] {
  const candidates = item.optionGroups.flatMap((group) =>
    group.options.map((option) => ({ group, option })),
  );
  return ordered.map(
    (picked) =>
      candidates.find(({ group, option }) =>
        picked.optionItemId != null
          ? option.optionItemId === picked.optionItemId
          : option.name.th === picked.name && group.name.th === picked.groupName,
      )?.option,
  );
}

export function isDefaultOnGroup(group: MenuOptionGroup): boolean {
  return group.defaultSelected && group.options.length > 0;
}

export function defaultSelection(groups: MenuOptionGroup[]): MenuOption[] {
  return groups.flatMap((group) => {
    const available = group.options.filter((option) => option.available);
    if (isDefaultOnGroup(group)) {
      return available.slice(0, group.maxSelect);
    }
    return group.minSelect > 0 ? available.slice(0, group.minSelect) : [];
  });
}

export function toggleOption(
  group: MenuOptionGroup,
  option: MenuOption,
  selected: MenuOption[],
): MenuOption[] {
  const inGroup = selected.filter((candidate) => candidate.groupId === group.id);
  const others = selected.filter((candidate) => candidate.groupId !== group.id);
  const isSelected = inGroup.some((candidate) => candidate.id === option.id);
  if (!option.available && !isSelected) {
    return selected;
  }
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
