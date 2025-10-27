-- ==============================================================================
-- Workspace Seed Data for TimescaleDB
-- ==============================================================================
-- Description: Sample data for workspace items (ideas, feature requests)
-- Database: frontend_apps
-- Schema: workspace
-- ==============================================================================

SET search_path TO workspace, public;

-- ==============================================================================
-- Sample Workspace Items
-- ==============================================================================

-- Clear existing data (optional - uncomment if needed)
-- TRUNCATE workspace.workspace_items CASCADE;
-- TRUNCATE workspace.workspace_audit_log CASCADE;

-- Insert sample ideas for each category
INSERT INTO workspace.workspace_items (
    title, 
    description, 
    category, 
    priority, 
    status, 
    tags, 
    created_by,
    metadata
) VALUES
-- Documentação
(
    'Melhorar documentação da API REST',
    'Adicionar exemplos de código em Python, JavaScript e curl para todos os endpoints da API. Incluir casos de uso comuns e troubleshooting.',
    'documentacao',
    'high',
    'in-progress',
    ARRAY['api', 'docs', 'examples'],
    'system',
    '{"estimated_hours": 8, "assigned_team": "docs"}'::JSONB
),
(
    'Criar guia de arquitetura do sistema',
    'Documentar a arquitetura completa do TradingSystem incluindo diagramas C4, fluxos de dados e decisões técnicas (ADRs).',
    'documentacao',
    'medium',
    'new',
    ARRAY['architecture', 'diagrams', 'adr'],
    'system',
    '{"estimated_hours": 16, "requires_review": true}'::JSONB
),

-- Coleta de Dados
(
    'Adicionar validação de dados em tempo real',
    'Implementar sistema de validação e sanitização de dados coletados antes de persistir no banco de dados.',
    'coleta-dados',
    'high',
    'new',
    ARRAY['validation', 'data-quality'],
    'system',
    '{"estimated_hours": 12, "priority_reason": "data integrity"}'::JSONB
),

-- Banco de Dados
(
    'Otimizar queries do TimescaleDB',
    'Analisar e otimizar as queries mais lentas do TimescaleDB. Adicionar índices apropriados e continuous aggregates onde necessário.',
    'banco-dados',
    'high',
    'in-progress',
    ARRAY['performance', 'timescaledb', 'optimization'],
    'system',
    '{"estimated_hours": 20, "current_bottleneck": "hypertable queries"}'::JSONB
),
(
    'Implementar backup automático diário',
    'Configurar backup automático diário de todos os bancos de dados com retenção de 30 dias e testes de restore mensais.',
    'banco-dados',
    'critical',
    'completed',
    ARRAY['backup', 'disaster-recovery', 'automation'],
    'system',
    '{"estimated_hours": 8, "completed_at": "2025-10-20", "backup_size_gb": 50}'::JSONB
),

-- Análise de Dados
(
    'Dashboard de análise de risco em tempo real',
    'Criar dashboard interativo mostrando exposição ao risco, Greeks agregados e análise de portfólio em tempo real.',
    'analise-dados',
    'medium',
    'new',
    ARRAY['dashboard', 'risk', 'real-time'],
    'system',
    '{"estimated_hours": 40, "requires_frontend": true}'::JSONB
),
(
    'Implementar algoritmo de detecção de anomalias',
    'Desenvolver sistema de ML para detectar anomalias em dados de mercado e alertar automaticamente.',
    'analise-dados',
    'medium',
    'rejected',
    ARRAY['ml', 'anomaly-detection', 'alerts'],
    'system',
    '{"estimated_hours": 80, "rejection_reason": "escopo muito amplo, dividir em múltiplas tasks"}'::JSONB
),

-- Gestão de Riscos
(
    'Sistema de alertas de limite de posição',
    'Implementar alertas automáticos quando posições atingirem limites pré-definidos de exposição ao risco.',
    'gestao-riscos',
    'critical',
    'in-progress',
    ARRAY['alerts', 'risk-limits', 'notifications'],
    'system',
    '{"estimated_hours": 24, "integration_required": ["email", "telegram"]}'::JSONB
),
(
    'Relatório de stress test automatizado',
    'Gerar relatórios automáticos de stress test do portfólio com diferentes cenários de mercado.',
    'gestao-riscos',
    'high',
    'review',
    ARRAY['stress-test', 'reports', 'scenarios'],
    'system',
    '{"estimated_hours": 32, "scenarios_count": 10}'::JSONB
),

-- Dashboard
(
    'Adicionar modo dark theme',
    'Implementar tema escuro em todo o dashboard com persistência de preferência do usuário.',
    'dashboard',
    'low',
    'completed',
    ARRAY['ui', 'ux', 'theme'],
    'system',
    '{"estimated_hours": 8, "completed_at": "2025-10-15"}'::JSONB
),
(
    'Melhorar responsividade mobile',
    'Otimizar interface para tablets e smartphones, garantindo boa experiência em todas as telas.',
    'dashboard',
    'medium',
    'new',
    ARRAY['mobile', 'responsive', 'ui'],
    'system',
    '{"estimated_hours": 16, "target_devices": ["tablet", "phone"]}'::JSONB
);

-- ==============================================================================
-- Statistics and Verification
-- ==============================================================================

-- Show inserted data statistics
DO $$ 
DECLARE
    total_items INTEGER;
    items_by_status RECORD;
    items_by_priority RECORD;
BEGIN
    SELECT COUNT(*) INTO total_items FROM workspace.workspace_items;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Workspace seed data inserted!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total items: %', total_items;
    RAISE NOTICE '';
    RAISE NOTICE '📊 Items by Status:';
    
    FOR items_by_status IN 
        SELECT status, COUNT(*) as count 
        FROM workspace.workspace_items 
        GROUP BY status 
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '   % : %', items_by_status.status, items_by_status.count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Items by Priority:';
    
    FOR items_by_priority IN 
        SELECT priority, COUNT(*) as count 
        FROM workspace.workspace_items 
        GROUP BY priority 
        ORDER BY 
            CASE priority 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
            END
    LOOP
        RAISE NOTICE '   % : %', items_by_priority.priority, items_by_priority.count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- ==============================================================================
-- Sample Queries for Testing
-- ==============================================================================

-- Uncomment to test queries:

-- All active items (not completed or rejected)
-- SELECT title, category, priority, status FROM workspace.workspace_items 
-- WHERE status NOT IN ('completed', 'rejected')
-- ORDER BY priority, created_at DESC;

-- High priority items in progress
-- SELECT title, category, created_at FROM workspace.workspace_items
-- WHERE priority IN ('high', 'critical')
-- AND status = 'in-progress';

-- Items by category with aggregates
-- SELECT 
--     category,
--     COUNT(*) as total,
--     COUNT(*) FILTER (WHERE status = 'completed') as completed,
--     COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress,
--     COUNT(*) FILTER (WHERE status = 'new') as new
-- FROM workspace.workspace_items
-- GROUP BY category
-- ORDER BY total DESC;
