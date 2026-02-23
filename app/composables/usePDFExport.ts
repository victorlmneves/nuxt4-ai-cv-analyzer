import type { IAnalysisResult } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────
import { useDateFormat } from '~/composables/useDateFormat';
const { formatDate } = useDateFormat();

function providerLabel(p: string): string {
    const map: Record<string, string> = { anthropic: 'Claude', openai: 'GPT-4o', gemini: 'Gemini' };

    return map[p] ?? p;
}

function verdictColor(verdict: string): [number, number, number] {
    const map: Record<string, [number, number, number]> = {
        'strong fit': [22, 163, 74],
        'good fit': [101, 163, 163],
        'partial fit': [217, 119, 6],
        'weak fit': [220, 38, 38],
    };

    return map[verdict] ?? [100, 100, 100];
}

// ── PDF Generation ────────────────────────────────────────────────────────────
export async function exportAnalysisPDF(result: IAnalysisResult): Promise<void> {
    // Dynamic import — jsPDF is only loaded when actually exporting
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = margin;

    const candidateName = result.candidate.name ?? 'Unknown Candidate';
    const roleName = result.jobDescription?.trim().split('\n')[0]?.slice(0, 60) ?? 'Role';

    // ── Header ────────────────────────────────────────────────────────────────
    doc.setFillColor(30, 30, 40);
    doc.rect(0, 0, pageW, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CV Analyst', margin, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 200);
    doc.text('by recruitr', margin + 32, 12);

    doc.setFontSize(9);
    doc.setTextColor(200, 200, 220);
    const dateTxt = formatDate(result.analysedAt) + ' · ' + providerLabel(result.provider);

    doc.text(dateTxt, pageW - margin - doc.getTextWidth(dateTxt), 12);

    y = 36;

    // ── Candidate block ───────────────────────────────────────────────────────
    doc.setTextColor(20, 20, 30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(candidateName, margin, y);
    y += 7;

    if (result.candidate.currentRole) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 100);
        doc.text(result.candidate.currentRole, margin, y);
        y += 5;
    }

    const meta = [result.candidate.totalExperience, result.candidate.location, result.candidate.education].filter(Boolean).join('  ·  ');

    if (meta) {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 140);
        doc.text(meta, margin, y);
        y += 5;
    }

    y += 3;
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // ── Fit Score row ─────────────────────────────────────────────────────────
    const scoreItems = [
        { label: 'Overall', value: result.fitScore.overall },
        { label: 'Technical', value: result.fitScore.technical },
        { label: 'Experience', value: result.fitScore.experience },
        { label: 'Soft Skills', value: result.fitScore.softSkills },
    ];

    const colW = contentW / 4;

    scoreItems.forEach((item, i) => {
        const x = margin + i * colW;
        const [r, g, b] =
            item.value >= 80 ? [22, 163, 74] : item.value >= 60 ? [101, 163, 163] : item.value >= 40 ? [217, 119, 6] : [220, 38, 38];

        doc.setFillColor(r, g, b);
        doc.roundedRect(x, y, colW - 3, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(String(item.value), x + 4, y + 10);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, x + 4, y + 14.5);
    });
    y += 20;

    // Verdict pill
    const [vr, vg, vb] = verdictColor(result.fitScore.verdict);

    doc.setFillColor(vr, vg, vb);
    doc.roundedRect(margin, y, 36, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(result.fitScore.verdict.toUpperCase(), margin + 3, y + 5);
    y += 12;

    // Summary
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 70);
    const summaryLines = doc.splitTextToSize(result.fitScore.summary, contentW) as string[];

    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 5;

    // ── Section helper ────────────────────────────────────────────────────────
    const sectionTitle = (title: string) => {
        if (y > pageH - 30) {
            doc.addPage();
            y = margin;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 40);
        doc.text(title, margin, y);
        y += 1;
        doc.setDrawColor(200, 200, 215);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 1, pageW - margin, y + 1);
        y += 6;
    };

    // ── Strengths & Gaps ──────────────────────────────────────────────────────
    sectionTitle('Strengths & Gaps');
    const halfW = (contentW - 4) / 2;

    const strCol = margin;
    const gapCol = margin + halfW + 4;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('Strengths', strCol, y);
    doc.setTextColor(220, 38, 38);
    doc.text('Gaps', gapCol, y);
    y += 5;

    const maxLines = Math.max(result.strengths.length, result.gaps.length);

    for (let i = 0; i < maxLines; i++) {
        const itemY = y;

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');

        if (result.strengths[i]) {
            const lines = doc.splitTextToSize('• ' + result.strengths[i], halfW) as string[];

            doc.setTextColor(40, 80, 40);
            doc.text(lines, strCol, itemY);
        }

        if (result.gaps[i]) {
            const lines = doc.splitTextToSize('• ' + result.gaps[i], halfW) as string[];

            doc.setTextColor(120, 40, 40);
            doc.text(lines, gapCol, itemY);
        }

        y += 5;
    }

    y += 4;

    // ── Red Flags ─────────────────────────────────────────────────────────────
    if (result.redFlags.length > 0) {
        sectionTitle('Red Flags');

        result.redFlags.forEach((flag) => {
            if (y > pageH - 20) {
                doc.addPage();
                y = margin;
            }

            const sevColor: [number, number, number] =
                flag.severity === 'high' ? [220, 38, 38] : flag.severity === 'medium' ? [217, 119, 6] : [100, 120, 100];

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...sevColor);
            doc.text(`[${flag.severity.toUpperCase()}] ${flag.title}`, margin, y);
            y += 5;

            const descLines = doc.splitTextToSize(flag.description, contentW - 4) as string[];

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 100);
            doc.text(descLines, margin + 2, y);
            y += descLines.length * 4.5 + 3;
        });

        y += 2;
    }

    // ── Tech Stack ────────────────────────────────────────────────────────────
    const allSkills = [
        ...result.techStack.languages,
        ...result.techStack.frameworks,
        ...result.techStack.databases,
        ...result.techStack.tools,
        ...result.techStack.cloud,
    ];

    if (allSkills.length > 0) {
        sectionTitle('Tech Stack');
        const chunks: string[][] = [];

        for (let i = 0; i < allSkills.length; i += 3) {
            chunks.push(allSkills.slice(i, i + 3).map((s) => `${s.name} (${s.level})`));
        }

        chunks.forEach((row) => {
            if (y > pageH - 16) {
                doc.addPage();
                y = margin;
            }

            row.forEach((cell, ci) => {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(50, 50, 70);
                doc.text(cell, margin + ci * (contentW / 3), y);
            });

            y += 5;
        });

        y += 4;
    }

    // ── Interview Questions ───────────────────────────────────────────────────
    if (result.interviewQuestions.length > 0) {
        sectionTitle('Interview Questions');
        const catColors: Record<string, [number, number, number]> = {
            technical: [59, 130, 246],
            behavioural: [139, 92, 246],
            situational: [245, 158, 11],
            cultural: [16, 185, 129],
        };

        result.interviewQuestions.forEach((q) => {
            if (y > pageH - 20) {
                doc.addPage();
                y = margin;
            }

            const [qr, qg, qb] = catColors[q.category] ?? [100, 100, 100];

            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(qr, qg, qb);
            doc.text(q.category.toUpperCase(), margin, y);
            y += 4.5;

            const qLines = doc.splitTextToSize(q.question, contentW - 2) as string[];

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 50);
            doc.text(qLines, margin, y);
            y += qLines.length * 4.5 + 1;

            const rLines = doc.splitTextToSize('→ ' + q.rationale, contentW - 4) as string[];

            doc.setFontSize(8);
            doc.setTextColor(110, 110, 140);
            doc.text(rLines, margin + 2, y);
            y += rLines.length * 4 + 4;
        });
    }

    // ── Footer on each page ───────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 180);
        doc.text(`CV Analyst · ${candidateName} · ${roleName}`, margin, pageH - 7);
        doc.text(`${p} / ${totalPages}`, pageW - margin - 8, pageH - 7);
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const fileName = `${candidateName.replace(/\W/g, '_')}_analysis.pdf`;

    doc.save(fileName);
}

// ── Composable ────────────────────────────────────────────────────────────────
export function usePDFExport() {
    const isExporting = ref(false);

    async function exportAnalysis(result: IAnalysisResult): Promise<void> {
        isExporting.value = true;

        try {
            await exportAnalysisPDF(result);
        } finally {
            isExporting.value = false;
        }
    }

    return { isExporting, exportAnalysis };
}
