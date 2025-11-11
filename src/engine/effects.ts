/**
 * Effects System
 * Executes effects that modify game state
 */

import { Effect, GameState, Story } from '../core/types';

/**
 * Result of applying effects
 */
export interface EffectResult {
  success: boolean;
  message?: string;
  gotoNodeId?: string;
  logs: string[];
}

/**
 * Apply an array of effects to the game state
 */
export function applyEffects(
  effects: Effect[] | undefined,
  state: GameState,
  story: Story
): EffectResult {
  const result: EffectResult = {
    success: true,
    logs: [],
  };

  if (!effects || effects.length === 0) {
    return result;
  }

  for (const effect of effects) {
    const effectResult = applySingleEffect(effect, state, story);
    result.logs.push(...effectResult.logs);

    if (effectResult.gotoNodeId) {
      result.gotoNodeId = effectResult.gotoNodeId;
    }

    if (!effectResult.success) {
      result.success = false;
    }
  }

  return result;
}

/**
 * Apply a single effect
 */
function applySingleEffect(
  effect: Effect,
  state: GameState,
  story: Story
): EffectResult {
  switch (effect.op) {
    case 'add_item':
      return applyAddItem(effect, state, story);

    case 'remove_item':
      return applyRemoveItem(effect, state, story);

    case 'add_currency':
      return applyAddCurrency(effect, state);

    case 'add_stat':
      return applyAddStat(effect, state, story);

    case 'set_flag':
      return applySetFlag(effect, state);

    case 'log':
      return applyLog(effect);

    case 'goto':
      return applyGoto(effect);

    case 'unlock_choice':
      return applyUnlockChoice(effect, state);

    case 'lock_choice':
      return applyLockChoice(effect, state);

    case 'set_timer':
      return applySetTimer(effect, state);

    case 'loot_table':
      return applyLootTable(effect, state, story);

    default:
      return {
        success: false,
        logs: [`Unknown effect operation: ${(effect as Effect).op}`],
      };
  }
}

// ============================================================================
// EFFECT IMPLEMENTATIONS
// ============================================================================

function applyAddItem(
  effect: Effect,
  state: GameState,
  story: Story
): EffectResult {
  if (!effect.item_id || effect.qty === undefined) {
    return { success: false, logs: ['Invalid add_item effect: missing item_id or qty'] };
  }

  const itemDef = story.items?.find((item) => item.id === effect.item_id);
  if (!itemDef) {
    return { success: false, logs: [`Item not found: ${effect.item_id}`] };
  }

  const currentQty = state.inventory[effect.item_id] || 0;
  let newQty = currentQty + effect.qty;

  // Apply max_stack limit
  if (itemDef.stackable && itemDef.max_stack) {
    newQty = Math.min(newQty, itemDef.max_stack);
  } else if (!itemDef.stackable) {
    newQty = Math.min(newQty, 1);
  }

  // Clamp to 0
  newQty = Math.max(0, newQty);

  state.inventory[effect.item_id] = newQty;

  return {
    success: true,
    logs: [`Added ${effect.qty} x ${itemDef.name} (total: ${newQty})`],
  };
}

function applyRemoveItem(effect: Effect, state: GameState, story: Story): EffectResult {
  if (!effect.item_id || effect.qty === undefined) {
    return {
      success: false,
      logs: ['Invalid remove_item effect: missing item_id or qty'],
    };
  }

  const itemDef = story.items?.find((item) => item.id === effect.item_id);
  const itemName = itemDef?.name || effect.item_id;

  const currentQty = state.inventory[effect.item_id] || 0;
  const newQty = Math.max(0, currentQty - effect.qty);

  state.inventory[effect.item_id] = newQty;

  return {
    success: true,
    logs: [`Removed ${effect.qty} x ${itemName} (remaining: ${newQty})`],
  };
}

function applyAddCurrency(effect: Effect, state: GameState): EffectResult {
  if (!effect.currency_id || effect.value === undefined) {
    return {
      success: false,
      logs: ['Invalid add_currency effect: missing currency_id or value'],
    };
  }

  const currentAmount = state.currencies[effect.currency_id] || 0;
  const newAmount = Math.max(0, currentAmount + (effect.value as number));

  state.currencies[effect.currency_id] = newAmount;

  return {
    success: true,
    logs: [`Currency ${effect.currency_id}: ${currentAmount} -> ${newAmount}`],
  };
}

function applyAddStat(effect: Effect, state: GameState, story: Story): EffectResult {
  if (!effect.stat_id || effect.value === undefined) {
    return {
      success: false,
      logs: ['Invalid add_stat effect: missing stat_id or value'],
    };
  }

  const statDef = story.stats?.find((stat) => stat.id === effect.stat_id);
  if (!statDef) {
    return { success: false, logs: [`Stat not found: ${effect.stat_id}`] };
  }

  const currentValue = state.stats[effect.stat_id] || statDef.start;
  let newValue = currentValue + (effect.value as number);

  // Clamp to min/max
  newValue = Math.max(statDef.min, Math.min(statDef.max, newValue));

  state.stats[effect.stat_id] = newValue;

  return {
    success: true,
    logs: [`Stat ${statDef.name}: ${currentValue} -> ${newValue}`],
  };
}

function applySetFlag(effect: Effect, state: GameState): EffectResult {
  if (!effect.flag || effect.value === undefined) {
    return {
      success: false,
      logs: ['Invalid set_flag effect: missing flag or value'],
    };
  }

  state.flags[effect.flag] = Boolean(effect.value);

  return {
    success: true,
    logs: [`Flag ${effect.flag} set to ${effect.value}`],
  };
}

function applyLog(effect: Effect): EffectResult {
  return {
    success: true,
    logs: [effect.message || ''],
  };
}

function applyGoto(effect: Effect): EffectResult {
  if (!effect.next_id) {
    return { success: false, logs: ['Invalid goto effect: missing next_id'] };
  }

  return {
    success: true,
    gotoNodeId: effect.next_id,
    logs: [`Jumping to node: ${effect.next_id}`],
  };
}

function applyUnlockChoice(effect: Effect, state: GameState): EffectResult {
  if (!effect.node_id || effect.choice_index === undefined) {
    return {
      success: false,
      logs: ['Invalid unlock_choice effect: missing node_id or choice_index'],
    };
  }

  state.lockedChoices = state.lockedChoices || {};
  const locked = state.lockedChoices[effect.node_id] || [];
  state.lockedChoices[effect.node_id] = locked.filter(
    (idx) => idx !== effect.choice_index
  );

  return {
    success: true,
    logs: [`Unlocked choice ${effect.choice_index} in node ${effect.node_id}`],
  };
}

function applyLockChoice(effect: Effect, state: GameState): EffectResult {
  if (!effect.node_id || effect.choice_index === undefined) {
    return {
      success: false,
      logs: ['Invalid lock_choice effect: missing node_id or choice_index'],
    };
  }

  state.lockedChoices = state.lockedChoices || {};
  const locked = state.lockedChoices[effect.node_id] || [];
  if (!locked.includes(effect.choice_index)) {
    locked.push(effect.choice_index);
  }
  state.lockedChoices[effect.node_id] = locked;

  return {
    success: true,
    logs: [`Locked choice ${effect.choice_index} in node ${effect.node_id}`],
  };
}

function applySetTimer(effect: Effect, state: GameState): EffectResult {
  if (!effect.timer_flag || effect.expires_in_ms === undefined) {
    return {
      success: false,
      logs: ['Invalid set_timer effect: missing timer_flag or expires_in_ms'],
    };
  }

  const expiresAt = Date.now() + effect.expires_in_ms;
  state.timers[effect.timer_flag] = { expiresAt };

  return {
    success: true,
    logs: [
      `Timer ${effect.timer_flag} set to expire in ${effect.expires_in_ms}ms`,
    ],
  };
}

function applyLootTable(
  effect: Effect,
  state: GameState,
  story: Story
): EffectResult {
  if (!effect.table || effect.table.length === 0) {
    return { success: false, logs: ['Invalid loot_table effect: empty table'] };
  }

  // Calculate total weight
  const totalWeight = effect.table.reduce((sum, entry) => sum + entry.weight, 0);

  // Random selection
  let random = Math.random() * totalWeight;
  let selectedEntry = effect.table[0];

  for (const entry of effect.table) {
    random -= entry.weight;
    if (random <= 0) {
      selectedEntry = entry;
      break;
    }
  }

  // Apply effects from selected entry
  const result = applyEffects(selectedEntry.effects, state, story);
  result.logs.unshift('Loot table rolled:');

  return result;
}
