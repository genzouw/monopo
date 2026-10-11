import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import Setup from '../Setup';
import { loadSetupConfig } from '../../../game/storage';

const ALT_ASSETS_LABEL = /あたらしい投資/;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Setup altAssets トグルの永続化', () => {
  it('チェックボックス操作で設定が保存され、再マウント後に checked が復元される', () => {
    const first = render(<Setup onStart={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: ALT_ASSETS_LABEL });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(loadSetupConfig()?.features?.altAssets).toBe(true);

    first.unmount();
    render(<Setup onStart={vi.fn()} />);
    expect(
      screen.getByRole('checkbox', { name: ALT_ASSETS_LABEL }),
    ).toBeChecked();
  });

  it('ゲーム開始時に altAssets を features として onStart へ渡す', () => {
    const onStart = vi.fn();
    render(<Setup onStart={onStart} />);

    fireEvent.click(screen.getByRole('checkbox', { name: ALT_ASSETS_LABEL }));
    fireEvent.click(screen.getByRole('button', { name: 'ゲームスタート！' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][2]).toMatchObject({ altAssets: true });
  });
});
