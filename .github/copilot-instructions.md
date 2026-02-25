<!-- BMAD:START -->

# BMAD Method — Project Instructions

## Project Configuration

- **Project**: har-mock-plugin
- **User**: Berk
- **Communication Language**: Turkish
- **Document Output Language**: Turkish
- **User Skill Level**: intermediate
- **Output Folder**: {project-root}/\_bmad-output
- **Planning Artifacts**: {project-root}/\_bmad-output/planning-artifacts
- **Implementation Artifacts**: {project-root}/\_bmad-output/implementation-artifacts
- **Project Knowledge**: {project-root}/docs

## BMAD Runtime Structure

- **Agent definitions**: `_bmad/bmm/agents/` (BMM module) and `_bmad/core/agents/` (core)
- **Workflow definitions**: `_bmad/bmm/workflows/` (organized by phase)
- **Core tasks**: `_bmad/core/tasks/` (help, editorial review, indexing, sharding, adversarial review)
- **Core workflows**: `_bmad/core/workflows/` (brainstorming, party-mode, advanced-elicitation)
- **Workflow engine**: `_bmad/core/tasks/workflow.xml` (executes YAML-based workflows)
- **Module configuration**: `_bmad/bmm/config.yaml`
- **Core configuration**: `_bmad/core/config.yaml`
- **Agent manifest**: `_bmad/_config/agent-manifest.csv`
- **Workflow manifest**: `_bmad/_config/workflow-manifest.csv`
- **Help manifest**: `_bmad/_config/bmad-help.csv`
- **Agent memory**: `_bmad/_memory/`

## Key Conventions

- Always load `_bmad/bmm/config.yaml` before any agent activation or workflow execution
- Store all config fields as session variables: `{user_name}`, `{communication_language}`, `{output_folder}`, `{planning_artifacts}`, `{implementation_artifacts}`, `{project_knowledge}`
- MD-based workflows execute directly — load and follow the `.md` file
- YAML-based workflows require the workflow engine — load `workflow.xml` first, then pass the `.yaml` config
- Follow step-based workflow execution: load steps JIT, never multiple at once
- Save outputs after EACH step when using the workflow engine
- The `{project-root}` variable resolves to the workspace root at runtime

## Available Agents

| Agent               | Persona     | Title                                                                | Capabilities                                                                             |
| ------------------- | ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| bmad-master         | BMad Master | BMad Master Executor, Knowledge Custodian, and Workflow Orchestrator | runtime resource management, workflow orchestration, task execution, knowledge custodian |
| analyst             | Mary        | Business Analyst                                                     | market research, competitive analysis, requirements elicitation, domain expertise        |
| architect           | Winston     | Architect                                                            | distributed systems, cloud infrastructure, API design, scalable patterns                 |
| dev                 | Amelia      | Developer Agent                                                      | story execution, test-driven development, code implementation                            |
| pm                  | John        | Product Manager                                                      | PRD creation, requirements discovery, stakeholder alignment, user interviews             |
| qa                  | Quinn       | QA Engineer                                                          | test automation, API testing, E2E testing, coverage analysis                             |
| quick-flow-solo-dev | Barry       | Quick Flow Solo Dev                                                  | rapid spec creation, lean implementation, minimum ceremony                               |
| sm                  | Bob         | Scrum Master                                                         | sprint planning, story preparation, agile ceremonies, backlog management                 |
| tech-writer         | Paige       | Technical Writer                                                     | documentation, Mermaid diagrams, standards compliance, concept explanation               |
| ux-designer         | Sally       | UX Designer                                                          | user research, interaction design, UI patterns, experience strategy                      |

## MCP Araç Erişim Kuralı

**Deferred (ertelenmiş) MCP araçları kullanılmadan önce `tool_search_tool_regex` ile yüklenmeli.** Atlassian (Jira/Confluence), Browser ve diğer MCP araçları "deferred tool" olarak tanımlıdır — doğrudan çağrılamaz, önce keşfedilmeli. Bir MCP aracına erişilemediği varsayılmamalı; mutlaka `tool_search_tool_regex` ile aranmalı, bulunamazsa ancak o zaman kullanıcıya bilgi verilmeli.

**Örnek:**

```
// YANLIŞ: "Jira MCP araçlarına erişemiyorum" demek
// DOĞRU: tool_search_tool_regex ile "mcp_com_atlassian" araması yapıp yüklemek
```

### Jira Araç Ön-Kontrol Kuralı (Session Başlangıcı & Workflow Öncesi)

**Bu kontrol her yeni session açılışında ve her workflow başlatılmadan önce ZORUNLU olarak yapılmalıdır.**

1. `tool_search_tool_regex` ile `mcp_com_atlassian` pattern'ı aranır
2. Arama sonucunda Jira araçları (özellikle `getTransitionsForJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`) bulunursa → session boyunca kullanılabilir, devam et
3. **Araçlar BULUNAMAZSA** → Kullanıcıya aşağıdaki uyarı gösterilmeli ve onay alınmalı:

```
⚠️ UYARI: Jira MCP araçları bu session'da yüklenemedi!
Atlassian MCP server bağlantısı aktif değil veya araçlar erişilemez durumda.

Bu durumda:
- sprint-status.yaml güncellemeleri yapılacak ama Jira senkronizasyonu ATLANACAK
- Jira issue transition'ları ve commit yorumları YAPILAMAYACAK
- Workflow sonunda Jira'da manuel güncelleme gerekecek

Devam etmek istiyor musun? [e/h]
```

4. Kullanıcı onay verirse workflow Jira senkronizasyonu olmadan devam eder
5. Bu kontrol sonucu session boyunca hatırlanır — her workflow'da tekrar arama yapılmaz, sadece ilk kontrolün sonucu kullanılır

### Jira Araç Ön-Kontrol Kuralı (Session Başlangıcı & Workflow Öncesi)

**Bu kontrol her yeni session açılışında ve her workflow başlatılmadan önce ZORUNLU olarak yapılmalıdır.**

1. `tool_search_tool_regex` ile `mcp_com_atlassian` pattern'ı aranır
2. Arama sonucunda Jira araçları (özellikle `getTransitionsForJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`) bulunursa → session boyunca kullanılabilir, devam et
3. **Araçlar BULUNAMAZSA** → Kullanıcıya aşağıdaki uyarı gösterilmeli ve onay alınmalı:

```
⚠️ UYARI: Jira MCP araçları bu session'da yüklenemedi!
Atlassian MCP server bağlantısı aktif değil veya araçlar erişilemez durumda.

Bu durumda:
- sprint-status.yaml güncellemeleri yapılacak ama Jira senkronizasyonu ATLANACAK
- Jira issue transition'ları ve commit yorumları YAPILAMAYACAK
- Workflow sonunda Jira'da manuel güncelleme gerekecek

Devam etmek istiyor musun? [e/h]
```

4. Kullanıcı onay verirse workflow Jira senkronizasyonu olmadan devam eder
5. Bu kontrol sonucu session boyunca hatırlanır — her workflow'da tekrar arama yapılmaz, sadece ilk kontrolün sonucu kullanılır

## Jira Sync Kuralı

**Bu kural tüm agentlar ve workflowlar için geçerlidir.**

`sprint-status.yaml` dosyasında herhangi bir story veya epic durumu değiştiğinde, Atlassian MCP araçları kullanılarak Jira'da da aynı değişiklik **otomatik olarak** yapılmalıdır.

### Yapılandırma

- **Jira Cloud ID**: `d7814cc6-cb29-4975-be2d-9b7f21cd5343`
- **Proje Anahtarı**: `SCRUM`
- **Base URL**: `https://berkdemircioglu.atlassian.net`
- **Yetkiler**: `read:jira-work`, `write:jira-work`

### Status Eşleştirmesi

| sprint-status.yaml | Jira Status |
| ------------------ | ----------- |
| backlog            | To Do       |
| ready-for-dev      | To Do       |
| in-progress        | In Progress |
| review             | In Review   |
| done               | Done        |

### Kurallar

1. `sprint-status.yaml`'da bir story/epic durumu değiştirildiğinde, o satırdaki `# SCRUM-XX` yorumundan Jira issue key okunur
2. `mcp_com_atlassian_getTransitionsForJiraIssue` ile mevcut geçişler alınır
3. `mcp_com_atlassian_transitionJiraIssue` ile hedef duruma geçiş yapılır
4. Yeni story/epic oluşturulduğunda `mcp_com_atlassian_createJiraIssue` ile Jira'da da oluşturulur ve issue key `sprint-status.yaml`'a eklenir
5. Jira güncellemesi başarısız olursa kullanıcıya bilgi verilir, ama sprint-status.yaml yine de güncellenir
6. Geliştirme sırasında yapılan her geliştirme adımında (dosya değişiklikleri tamamlandığında) `git add` + `git commit` yapılmalıdır. Story review'a gönderilmeden önce tüm değişiklikler commit'lenmiş olmalıdır. Commit atilmadan once onay istenmelidir.
7. Her commit sonrasında, ilgili Jira task'ına `mcp_com_atlassian_addCommentToJiraIssue` ile yorum eklenir. Yorum formatı:
   ```
   🔧 Commit: <commitId>
   <geliştirmenin kısa açıklaması>
   ```

## Slash Commands

Type `/bmad-` in Copilot Chat to see all available BMAD workflows and agent activators. Agents are also available in the agents dropdown.

<!-- BMAD:END -->
