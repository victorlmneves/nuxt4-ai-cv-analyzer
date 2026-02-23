import jsPDF from 'jspdf';
import type { IComparisonResult } from '~/types/index';

export async function exportComparisonPDF(result: IComparisonResult): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const margin = 14;
    let y = margin;

    // Header
    doc.setFontSize(18);
    doc.text('Candidate Comparison', pageW / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(12);
    doc.text(`Role: ${result.roleName}`, margin, y);
    doc.text(`Provider: ${result.provider}`, pageW - margin, y, { align: 'right' });
    y += 8;
    doc.text(`Compared at: ${result.comparedAt}`, margin, y);
    y += 10;

    // Recommendation
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text(`AI Recommendation: ${result.recommendation}`, margin, y);
    y += 10;
    doc.setTextColor(0, 0, 0);

    // Table header
    doc.setFontSize(12);
    const colW = (pageW - margin * 2) / (result.candidates.length + 1);
    let x = margin;

    doc.text('Metric', x, y);

    result.candidates.forEach((c, i) => {
        doc.text(c.name || `Candidate ${i + 1}`, x + colW * (i + 1), y);
    });

    y += 7;

    // Table rows
    const rows = [
        { label: 'Overall', values: result.candidates.map((c) => c.overallScore.toString()) },
        { label: 'Technical', values: result.candidates.map((c) => c.technicalScore.toString()) },
        { label: 'Experience', values: result.candidates.map((c) => c.experienceScore.toString()) },
        { label: 'Soft Skills', values: result.candidates.map((c) => c.softSkillsScore.toString()) },
        { label: 'Verdict', values: result.candidates.map((c) => c.verdict) },
        { label: 'Red Flags', values: result.candidates.map((c) => c.redFlagCount.toString()) },
        { label: 'Integration', values: result.candidates.map((c) => c.integrationEase) },
        { label: 'Strengths', values: result.candidates.map((c) => c.topStrengths.join(', ')) },
        { label: 'Gaps', values: result.candidates.map((c) => c.topGaps.join(', ')) },
        { label: 'Tech Stack', values: result.candidates.map((c) => c.techStackHighlights.join(', ')) },
    ];

    rows.forEach((row) => {
        x = margin;
        doc.text(row.label, x, y);

        row.values.forEach((val, i) => {
            doc.text(val, x + colW * (i + 1), y);
        });

        y += 7;

        if (y > 190) {
            doc.addPage();
            y = margin;
        }
    });

    // Ranking
    y += 5;
    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74);
    doc.text('Ranking:', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 7;
    doc.text(result.rankedOrder.map((n, i) => `#${i + 1} ${n}`).join('   '), margin, y);

    // Save
    doc.save(`comparison_${result.roleName.replace(/\W/g, '_')}.pdf`);
}
