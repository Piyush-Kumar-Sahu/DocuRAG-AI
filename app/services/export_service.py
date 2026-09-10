import io
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class ExportService:
    @staticmethod
    def generate_chat_pdf(
        title: str,
        document_title: str,
        messages: List[Dict[str, Any]],
        user_email: str = "Anonymous User"
    ) -> io.BytesIO:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=6,
        )
        meta_style = ParagraphStyle(
            'MetaStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=14,
        )
        user_bubble_style = ParagraphStyle(
            'UserBubbleStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#2563EB'),
            spaceAfter=4,
        )
        user_text_style = ParagraphStyle(
            'UserTextStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=12,
        )
        assistant_bubble_style = ParagraphStyle(
            'AssistantBubbleStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=4,
        )
        assistant_text_style = ParagraphStyle(
            'AssistantTextStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=8,
        )
        source_title_style = ParagraphStyle(
            'SourceTitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#475569'),
            spaceAfter=3,
        )
        source_text_style = ParagraphStyle(
            'SourceTextStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=4,
        )
        story = []
        story.append(Paragraph(f"Chat Transcript: {title}", title_style))
        story.append(
            Paragraph(
                f"<b>Document:</b> {document_title} &nbsp;|&nbsp; "
                f"<b>Exported:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')} &nbsp;|&nbsp; "
                f"<b>User:</b> {user_email}",
                meta_style
            )
        )
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=14))
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            sources = msg.get('sources', []) or []

            if role == 'user':
                story.append(Paragraph("YOU:", user_bubble_style))
                story.append(Paragraph(content.replace('\n', '<br/>'), user_text_style))
            else:
                story.append(Paragraph("ASSISTANT:", assistant_bubble_style))
                story.append(Paragraph(content.replace('\n', '<br/>'), assistant_text_style))

                if sources:
                    story.append(Paragraph("<b>Sources / References:</b>", source_title_style))
                    for src in sources:
                        page_num = src.get('page_number', 1)
                        snippet = src.get('snippet', '')
                        doc_name = src.get('document_filename', src.get('document_title', ''))
                        label = f"<b>{doc_name} &bull; Page {page_num}</b>" if doc_name else f"<b>Page {page_num}</b>"
                        story.append(
                            Paragraph(
                                f"&bull; {label}: \"{snippet}\"",
                                source_text_style
                            )
                        )
                story.append(Spacer(1, 10))

            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#F1F5F9'), spaceAfter=10))

        doc.build(story)
        buffer.seek(0)
        return buffer

export_service = ExportService()
