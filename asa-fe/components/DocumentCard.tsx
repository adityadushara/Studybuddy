'use client'
import { Document } from '@/lib/api'
import { formatDate, formatFileSize } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, BookOpen, Trash2 } from 'lucide-react'

interface DocumentCardProps {
    document: Document
    onStudy?: (doc: Document) => void
    onDelete?: (doc: Document) => void
}

export default function DocumentCard({ document, onStudy, onDelete }: DocumentCardProps) {
    return (
        <Card className="card-hover group">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{document.title || document.filename}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {formatFileSize(document.file_size)} · {formatDate(document.created_at)}
                        </p>
                        {document.page_count && (
                            <Badge variant="outline" className="text-xs mt-1.5">{document.page_count} pages</Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 mt-3">
                    {onStudy && (
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => onStudy(document)}>
                            <BookOpen className="h-3.5 w-3.5" /> Study
                        </Button>
                    )}
                    {onDelete && (
                        <button onClick={() => onDelete(document)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
