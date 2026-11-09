"""Compile the shared displayed-point HP and action-budget settings."""
from pathlib import Path
import json, math

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'design/combat_balance.json').read_text())
assert [t['theme'] for t in DATA['themes']] == list(range(1, 21))
assert set(DATA['guardians']) == {str(n) for n in range(5, 101, 5)}


def easy_hp(hp):
    return min(DATA['easy']['hpCap'], math.floor(hp * DATA['easy']['hpFactor'] + .5))


def apply(level):
    n = level['id']
    stats = DATA['guardians'].get(str(n), DATA['themes'][(n - 1) // 5])
    level['enemyHp'] = stats['hp'] / 20
    level['easyEnemyHp'] = easy_hp(stats['hp']) / 20
    level['actionLimit'] = stats['actionLimit']
    level['balanceRevision'] = DATA['revision']
    if n == 100:
        final = level['finalBattle']
        final['fixedHp'] = DATA['final']['playerHp']
        final['requiredDamage'] = DATA['final']['requiredDamage'] / 20
        final['easyRequiredDamage'] = easy_hp(DATA['final']['requiredDamage']) / 20
        final['specialAmmo'] = DATA['final']['specialAmmo']
        final['actionLimits'] = {id: stats['actionLimit'] for id in final['order']}
        level['enemyHp'] = final['requiredDamage'] * len(final['order'])
        level['easyEnemyHp'] = final['easyRequiredDamage'] * len(final['order'])
