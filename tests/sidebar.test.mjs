import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isSidebarCollapsed } from '../lib/types/client/sidebar/collapsed.js'

describe('sidebar collapse signals', () => {
  it('treats a collapsed class token as collapsed', () => {
    assert.equal(isSidebarCollapsed({ className: 'root collapsed' }), true)
    assert.equal(isSidebarCollapsed({ className: 'root root_collapsed_abc' }), true)
  })

  it('treats the host collapse attribute and ancestors as collapsed', () => {
    assert.equal(isSidebarCollapsed({ collapsedAttr: 'true' }), true)
    assert.equal(isSidebarCollapsed({ ancestorCollapsed: true }), true)
  })

  it('stays expanded for ordinary roots and explicit false values', () => {
    assert.equal(isSidebarCollapsed({ className: 'root wide' }), false)
    assert.equal(isSidebarCollapsed({ collapsedAttr: 'false', className: 'root wide' }), false)
    assert.equal(isSidebarCollapsed({}), false)
  })
})
