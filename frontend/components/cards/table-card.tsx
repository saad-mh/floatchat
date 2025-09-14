"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Search, Download, Filter, ChevronUp, ChevronDown } from "lucide-react"

interface TableCardProps {
  dataUri?: string
}

interface TableData {
  headers: string[]
  rows: string[][]
  metadata?: {
    totalRows: number
    source: string
    lastUpdated?: string
  }
}

type SortDirection = "asc" | "desc" | null

export function TableCard({ dataUri }: TableCardProps) {
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 6

  useEffect(() => {
    const loadTableData = async () => {
      if (!dataUri) {
        // Generate enhanced sample table data for demo
        setTableData({
          headers: ["Float ID", "Cycle", "Date", "Latitude", "Longitude", "Profiles", "QC Status"],
          rows: [
            ["WMO_5901234", "182", "2023-03-15", "0.12°N", "0.03°W", "3", "Good"],
            ["WMO_5902345", "183", "2023-03-18", "0.20°S", "0.80°E", "2", "Good"],
            ["WMO_5903456", "184", "2023-03-21", "0.05°N", "0.15°E", "4", "Flagged"],
            ["WMO_5904567", "185", "2023-03-24", "0.30°S", "0.25°W", "1", "Good"],
            ["WMO_5905678", "186", "2023-03-27", "0.18°N", "0.42°E", "3", "Good"],
            ["WMO_5906789", "187", "2023-03-30", "0.08°S", "0.12°W", "2", "Good"],
            ["WMO_5907890", "188", "2023-04-02", "0.25°N", "0.35°E", "5", "Flagged"],
            ["WMO_5908901", "189", "2023-04-05", "0.15°S", "0.28°W", "3", "Good"],
          ],
          metadata: {
            totalRows: 8,
            source: "Argo Global Data Assembly Centre",
            lastUpdated: "2023-04-05T12:00:00Z",
          },
        })
        setLoading(false)
        return
      }

      try {
        // In a real implementation, this would fetch from the dataUri
        const response = await fetch(dataUri)
        if (!response.ok) {
          throw new Error("Failed to load table data")
        }
        const data = await response.json()
        setTableData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load table data")
      } finally {
        setLoading(false)
      }
    }

    loadTableData()
  }, [dataUri])

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc")
      if (sortDirection === "desc") {
        setSortColumn(null)
      }
    } else {
      setSortColumn(columnIndex)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedData = () => {
    if (!tableData) return []

    const filtered = tableData.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(searchTerm.toLowerCase())),
    )

    if (sortColumn !== null && sortDirection) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        // Try to parse as numbers for numeric sorting
        const aNum = Number.parseFloat(aVal.replace(/[^\d.-]/g, ""))
        const bNum = Number.parseFloat(bVal.replace(/[^\d.-]/g, ""))

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === "asc" ? aNum - bNum : bNum - aNum
        }

        // String sorting
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }

    return filtered
  }

  const paginatedData = () => {
    const filtered = filteredAndSortedData()
    const startIndex = (currentPage - 1) * rowsPerPage
    return filtered.slice(startIndex, startIndex + rowsPerPage)
  }

  const totalPages = Math.ceil(filteredAndSortedData().length / rowsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading table...</p>
        </div>
      </div>
    )
  }

  if (error || !tableData) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg">
        <div className="text-center">
          <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error || "No table data available"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Table controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 bg-background border-border text-sm"
            />
          </div>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {filteredAndSortedData().length} rows
          </Badge>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="outline" size="sm" className="text-xs bg-transparent px-2 md:px-3">
            <Filter className="w-3 h-3 md:mr-1" />
            <span className="hidden md:inline">Filter</span>
          </Button>
          <Button variant="outline" size="sm" className="text-xs bg-transparent px-2 md:px-3">
            <Download className="w-3 h-3 md:mr-1" />
            <span className="hidden md:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="max-h-80 overflow-auto overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
              <TableRow>
                {tableData.headers.map((header, index) => (
                  <TableHead
                    key={index}
                    className="text-foreground font-medium cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort(index)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{header}</span>
                      {sortColumn === index && (
                        <div className="text-primary">
                          {sortDirection === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData().map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-muted/30 transition-colors">
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex} className="text-foreground">
                      {cellIndex === 6 ? ( // QC Status column
                        <Badge variant={cell === "Good" ? "default" : "destructive"} className="text-xs">
                          {cell}
                        </Badge>
                      ) : cellIndex === 0 ? ( // Float ID column
                        <span className="font-mono text-primary">{cell}</span>
                      ) : (
                        cell
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination and metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {tableData.metadata && (
            <>
              <div>Source: {tableData.metadata.source}</div>
              {tableData.metadata.lastUpdated && (
                <div>Updated: {new Date(tableData.metadata.lastUpdated).toLocaleDateString()}</div>
              )}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
