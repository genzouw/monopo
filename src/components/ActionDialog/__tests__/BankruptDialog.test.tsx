import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import BankruptDialog from '../BankruptDialog';

afterEach(() => {
  cleanup();
});

describe('BankruptDialog', () => {
  it('onClose を渡さないため閉じるボタンは表示されない（強制遷移が必要なダイアログ）', () => {
    render(<BankruptDialog playerName="プレイヤー1" onConfirm={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: '閉じる' }),
    ).not.toBeInTheDocument();
  });
});
