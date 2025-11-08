"""
Export Engine for FloatChat
Export data and visualizations in various formats (CSV, NetCDF, PDF, etc.)
"""

import os
import io
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd
import numpy as np
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
import base64


class ExportEngine:
    """Engine for exporting data in various formats"""
    
    @staticmethod
    def export_to_csv(
        data: List[Dict[str, Any]],
        filename: Optional[str] = None
    ) -> str:
        """
        Export data to CSV format
        
        Args:
            data: List of data dictionaries
            filename: Optional filename
            
        Returns:
            CSV string or file path
        """
        if not data:
            return ""
        
        df = pd.DataFrame(data)
        
        if filename:
            df.to_csv(filename, index=False)
            return filename
        else:
            return df.to_csv(index=False)
    
    @staticmethod
    def export_to_json(
        data: Any,
        filename: Optional[str] = None,
        pretty: bool = True
    ) -> str:
        """
        Export data to JSON format
        
        Args:
            data: Data to export
            filename: Optional filename
            pretty: Pretty print JSON
            
        Returns:
            JSON string or file path
        """
        indent = 2 if pretty else None
        json_str = json.dumps(data, indent=indent, default=str)
        
        if filename:
            with open(filename, 'w') as f:
                f.write(json_str)
            return filename
        else:
            return json_str
    
    @staticmethod
    def export_to_netcdf(
        data: Dict[str, Any],
        filename: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Export data to NetCDF format
        
        Args:
            data: Data dictionary with variables
            filename: Output filename
            metadata: Optional metadata
            
        Returns:
            File path
        """
        try:
            import xarray as xr
            
            # Convert data to xarray Dataset
            data_vars = {}
            for key, values in data.items():
                if isinstance(values, (list, np.ndarray)):
                    data_vars[key] = (['index'], np.array(values))
            
            ds = xr.Dataset(data_vars)
            
            # Add metadata
            if metadata:
                ds.attrs.update(metadata)
            
            # Add standard attributes
            ds.attrs['created_at'] = datetime.utcnow().isoformat()
            ds.attrs['source'] = 'FloatChat'
            
            # Save to NetCDF
            ds.to_netcdf(filename)
            return filename
        except Exception as e:
            print(f"Error exporting to NetCDF: {e}")
            return ""
    
    @staticmethod
    def export_to_excel(
        data: List[Dict[str, Any]],
        filename: str,
        sheet_name: str = "Data"
    ) -> str:
        """
        Export data to Excel format
        
        Args:
            data: List of data dictionaries
            filename: Output filename
            sheet_name: Sheet name
            
        Returns:
            File path
        """
        try:
            df = pd.DataFrame(data)
            df.to_excel(filename, sheet_name=sheet_name, index=False)
            return filename
        except Exception as e:
            print(f"Error exporting to Excel: {e}")
            return ""
    
    @staticmethod
    def create_pdf_report(
        query: str,
        sql: str,
        data: List[Dict[str, Any]],
        summary: str,
        visualizations: Optional[List[Dict[str, Any]]] = None,
        filename: str = "report.pdf"
    ) -> str:
        """
        Create PDF report with query results
        
        Args:
            query: Natural language query
            sql: Generated SQL
            data: Query results
            summary: Result summary
            visualizations: Optional visualization data
            filename: Output filename
            
        Returns:
            File path
        """
        try:
            # Create PDF document
            doc = SimpleDocTemplate(filename, pagesize=letter)
            story = []
            styles = getSampleStyleSheet()
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                textColor=colors.HexColor('#1e40af'),
                spaceAfter=30
            )
            story.append(Paragraph("FloatChat Query Report", title_style))
            story.append(Spacer(1, 0.2*inch))
            
            # Metadata
            meta_style = styles['Normal']
            story.append(Paragraph(f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", meta_style))
            story.append(Spacer(1, 0.2*inch))
            
            # Query section
            story.append(Paragraph("<b>Natural Language Query:</b>", styles['Heading2']))
            story.append(Paragraph(query, styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
            
            # SQL section
            story.append(Paragraph("<b>Generated SQL:</b>", styles['Heading2']))
            sql_style = ParagraphStyle(
                'Code',
                parent=styles['Code'],
                fontSize=9,
                leftIndent=20,
                backColor=colors.HexColor('#f3f4f6')
            )
            story.append(Paragraph(sql.replace('\n', '<br/>'), sql_style))
            story.append(Spacer(1, 0.2*inch))
            
            # Summary section
            story.append(Paragraph("<b>Summary:</b>", styles['Heading2']))
            story.append(Paragraph(summary, styles['Normal']))
            story.append(Spacer(1, 0.3*inch))
            
            # Data table (first 50 rows)
            if data:
                story.append(Paragraph("<b>Results (first 50 rows):</b>", styles['Heading2']))
                story.append(Spacer(1, 0.1*inch))
                
                df = pd.DataFrame(data[:50])
                
                # Create table data
                table_data = [df.columns.tolist()] + df.values.tolist()
                
                # Create table
                table = Table(table_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                story.append(table)
            
            # Build PDF
            doc.build(story)
            return filename
        except Exception as e:
            print(f"Error creating PDF report: {e}")
            return ""
    
    @staticmethod
    def export_visualization_as_image(
        viz_data: Dict[str, Any],
        viz_type: str,
        filename: str,
        format: str = "png"
    ) -> str:
        """
        Export visualization as image
        
        Args:
            viz_data: Visualization data
            viz_type: Type of visualization (map, chart, etc.)
            filename: Output filename
            format: Image format (png, jpg, svg)
            
        Returns:
            File path
        """
        try:
            import matplotlib.pyplot as plt
            
            fig, ax = plt.subplots(figsize=(10, 6))
            
            if viz_type == "chart":
                # Create chart from data
                if "traces" in viz_data:
                    for trace in viz_data["traces"]:
                        ax.plot(trace["values"], trace["depths"], label=trace["float"])
                    ax.set_xlabel(viz_data.get("variable", "Value"))
                    ax.set_ylabel("Depth (m)")
                    ax.invert_yaxis()
                    ax.legend()
                    ax.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.savefig(filename, format=format, dpi=300)
            plt.close()
            
            return filename
        except Exception as e:
            print(f"Error exporting visualization: {e}")
            return ""
    
    @staticmethod
    def create_data_package(
        query: str,
        sql: str,
        data: List[Dict[str, Any]],
        summary: str,
        output_dir: str = "export"
    ) -> Dict[str, str]:
        """
        Create complete data package with multiple formats
        
        Args:
            query: Natural language query
            sql: Generated SQL
            data: Query results
            summary: Result summary
            output_dir: Output directory
            
        Returns:
            Dictionary of exported files
        """
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        exported_files = {}
        
        # CSV export
        csv_file = os.path.join(output_dir, f"data_{timestamp}.csv")
        ExportEngine.export_to_csv(data, csv_file)
        exported_files["csv"] = csv_file
        
        # JSON export
        json_file = os.path.join(output_dir, f"data_{timestamp}.json")
        ExportEngine.export_to_json({
            "query": query,
            "sql": sql,
            "summary": summary,
            "data": data
        }, json_file)
        exported_files["json"] = json_file
        
        # PDF report
        pdf_file = os.path.join(output_dir, f"report_{timestamp}.pdf")
        ExportEngine.create_pdf_report(query, sql, data, summary, filename=pdf_file)
        exported_files["pdf"] = pdf_file
        
        # Metadata file
        metadata_file = os.path.join(output_dir, f"metadata_{timestamp}.json")
        ExportEngine.export_to_json({
            "query": query,
            "sql": sql,
            "summary": summary,
            "record_count": len(data),
            "exported_at": datetime.utcnow().isoformat(),
            "files": exported_files
        }, metadata_file)
        exported_files["metadata"] = metadata_file
        
        return exported_files


class DataFormatter:
    """Format data for various use cases"""
    
    @staticmethod
    def format_for_api(data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Format data for API response"""
        return {
            "count": len(data),
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def format_for_download(
        data: List[Dict[str, Any]],
        format: str = "csv"
    ) -> bytes:
        """
        Format data for download
        
        Args:
            data: Data to format
            format: Output format
            
        Returns:
            Bytes for download
        """
        if format == "csv":
            csv_str = ExportEngine.export_to_csv(data)
            return csv_str.encode('utf-8')
        elif format == "json":
            json_str = ExportEngine.export_to_json(data)
            return json_str.encode('utf-8')
        else:
            return b""
    
    @staticmethod
    def format_for_visualization(
        data: List[Dict[str, Any]],
        viz_type: str
    ) -> Dict[str, Any]:
        """Format data specifically for visualization"""
        if viz_type == "map":
            return {
                "markers": [
                    {
                        "lat": row.get("latitude"),
                        "lon": row.get("longitude"),
                        "label": row.get("float_id", "Unknown")
                    }
                    for row in data
                    if row.get("latitude") and row.get("longitude")
                ]
            }
        elif viz_type == "chart":
            # Group by float_id for profiles
            grouped = {}
            for row in data:
                float_id = row.get("float_id")
                if float_id:
                    if float_id not in grouped:
                        grouped[float_id] = {"depths": [], "values": []}
                    if row.get("pres_adjusted"):
                        grouped[float_id]["depths"].append(row["pres_adjusted"])
                    if row.get("psal_adjusted"):
                        grouped[float_id]["values"].append(row["psal_adjusted"])
            
            return {
                "traces": [
                    {
                        "id": float_id,
                        "float": float_id,
                        "depths": data["depths"],
                        "values": data["values"]
                    }
                    for float_id, data in grouped.items()
                ]
            }
        else:
            return {"data": data}


# Convenience functions
def export_query_results(
    query: str,
    sql: str,
    data: List[Dict[str, Any]],
    summary: str,
    formats: List[str] = ["csv", "json", "pdf"]
) -> Dict[str, str]:
    """
    Export query results in multiple formats
    
    Args:
        query: Natural language query
        sql: Generated SQL
        data: Query results
        summary: Result summary
        formats: List of formats to export
        
    Returns:
        Dictionary of exported files
    """
    engine = ExportEngine()
    exported = {}
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    if "csv" in formats:
        filename = f"export_{timestamp}.csv"
        exported["csv"] = engine.export_to_csv(data, filename)
    
    if "json" in formats:
        filename = f"export_{timestamp}.json"
        exported["json"] = engine.export_to_json({
            "query": query,
            "sql": sql,
            "summary": summary,
            "data": data
        }, filename)
    
    if "pdf" in formats:
        filename = f"report_{timestamp}.pdf"
        exported["pdf"] = engine.create_pdf_report(query, sql, data, summary, filename=filename)
    
    return exported
