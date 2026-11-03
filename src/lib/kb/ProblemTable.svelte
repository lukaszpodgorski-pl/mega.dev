<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { mistagged, PROBLEMS, splitTicket } from '#lib/kb/problems';
  import { tenantOf } from '#lib/kb/locales';
  import type { Report } from '#lib/kb/causes';

  // issues: problem → the ticket that now holds it, e.g. { parser: 'lukaszpodgorski-pl/mega.dev#1' }
  let { ticket, issues = {} }: { ticket: number; issues?: Record<string, string> } = $props();

  const split = $derived(splitTicket(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const fmt = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const link = (ref: string) => {
    const [repo, num] = ref.split('#');
    return `https://github.com/${repo}/issues/${num}`;
  };
</script>

<p class="sum">
  <strong>{split.rows}</strong> rows in the export · <strong>{split.unique}</strong> distinct reports merged into #{ticket} ·
  <strong>{split.groups.length}</strong> problems
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>intake tagged as</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code><br /><span class="t">{PROBLEMS[g.problem].title}</span></td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{g.tenants}</td>
        <td class="m">{fmt(g.channels)}</td>
        <td class="m">{fmt(g.taggedAs)}</td>
        <td class="m">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if issues[g.problem]}<a href={link(issues[g.problem])}>{issues[g.problem]}</a>{:else}—{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<ul class="m">
  <li>{split.rows - split.unique} rows are the same report twice (the export pages overlap); counted once.</li>
  {#each split.groups as g (g.problem)}
    {@const n = mistagged(g)}
    {#if n}<li>{n} of the {g.reports.length} <code>{g.problem}</code> reports carry another intake tag.</li>{/if}
  {/each}
</ul>

<style>
  .sum { font-size: 1.1rem; }
  .t { color: var(--muted); font-size: 0.85em; }
  .m { color: var(--muted); font-size: 0.85em; }
</style>
