import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import Dialog from '../Dialog';

afterEach(() => {
  cleanup();
});

describe('Dialog', () => {
  it('role="dialog" と aria-modal を持つ', () => {
    render(
      <Dialog title="テスト">
        <button>OK</button>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('aria-labelledby が title 要素と関連付けされている', () => {
    render(
      <Dialog title="タイトル文字列">
        <div>本文</div>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe(
      'タイトル文字列',
    );
  });

  it('onClose が指定されているとき Escape で onClose が呼ばれる', () => {
    const onClose = vi.fn();
    render(
      <Dialog title="テスト" onClose={onClose}>
        <button>OK</button>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onClose が未指定のとき Escape ではクローズしない', () => {
    render(
      <Dialog title="テスト">
        <button>OK</button>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('マウント時に Dialog 内の最初の focusable 要素にフォーカスが当たる', () => {
    render(
      <Dialog
        title="テスト"
        actions={
          <>
            <button>キャンセル</button>
            <button>OK</button>
          </>
        }
      >
        <button>本文ボタン</button>
      </Dialog>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '本文ボタン' }),
    );
  });

  it('最後の要素で Tab を押すと最初の focusable 要素に循環する', () => {
    render(
      <Dialog
        title="テスト"
        actions={
          <>
            <button>キャンセル</button>
            <button>OK</button>
          </>
        }
      >
        <button>本文ボタン</button>
      </Dialog>,
    );
    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('最初の要素で Shift+Tab を押すと最後の focusable 要素に循環する', () => {
    render(
      <Dialog
        title="テスト"
        actions={
          <>
            <button>キャンセル</button>
            <button>OK</button>
          </>
        }
      >
        <button>本文ボタン</button>
      </Dialog>,
    );
    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('アンマウント時に直前のアクティブ要素にフォーカスが復帰する', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'トリガー';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <Dialog title="テスト">
        <button>OK</button>
      </Dialog>,
    );
    expect(document.activeElement).not.toBe(trigger);
    unmount();
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
