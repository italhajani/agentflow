"""
Agent Templates — pre-built agent blueprints users can clone.
ShopWise is the first template (from your notebook!).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User, Agent, ModelProvider
from app.schemas.schemas import AgentTemplate, TemplateListResponse, AgentResponse

router = APIRouter(prefix="/templates", tags=["templates"])

# ── Template catalog ──────────────────────────────────────────────────────────
TEMPLATES: list[AgentTemplate] = [
    AgentTemplate(
        id="shopwise",
        name="ShopWise — E-commerce Assistant",
        description=(
            "AI shopping assistant that helps users find products, answer FAQs, "
            "manage carts, and provide style recommendations. Based on a real working agent."
        ),
        category="E-commerce",
        icon="🛍️",
        role="E-commerce Shopping Assistant",
        goal=(
            "Help users discover products, answer store FAQs, manage their shopping cart, "
            "and provide personalised recommendations. Be friendly, concise, and always "
            "guide users toward completing their purchase."
        ),
        backstory=(
            "You are ShopWise, a premium AI shopping assistant. You have deep knowledge "
            "of the product catalog, store policies, and fashion trends. You genuinely enjoy "
            "helping people find exactly what they're looking for and love making great recommendations."
        ),
        suggested_tools=["web_search"],
        model_provider=ModelProvider.groq,
        model_name="llama3-8b-8192",
        example_tasks=[
            "Show me blue cotton shirts for men under $60",
            "What is the return policy?",
            "Add the Oxford shirt in size M to my cart",
            "Recommend something to pair with cargo trousers",
            "What are the top-rated products on sale?",
        ],
        tags=["ecommerce", "shopping", "retail", "customer-support"],
        is_featured=True,
    ),
    AgentTemplate(
        id="researcher",
        name="Research Assistant",
        description=(
            "Searches the web, summarises findings, and delivers structured research "
            "reports on any topic. Great for market research, news summaries, and fact-checking."
        ),
        category="Research",
        icon="🔍",
        role="Senior Research Analyst",
        goal=(
            "Research topics thoroughly using web search, synthesise findings from multiple "
            "sources, and deliver clear, structured, well-cited reports."
        ),
        backstory=(
            "You are a meticulous research analyst with experience in academic, market, "
            "and investigative research. You never guess — you search, verify, and cite."
        ),
        suggested_tools=["web_search"],
        model_provider=ModelProvider.groq,
        model_name="llama3-70b-8192",
        example_tasks=[
            "Research the latest AI agent frameworks in 2025",
            "Summarise the top 5 competitors of Notion",
            "What are the current trends in sustainable fashion?",
            "Find recent news about electric vehicle adoption",
        ],
        tags=["research", "analysis", "web-search", "reports"],
        is_featured=True,
    ),
    AgentTemplate(
        id="content_writer",
        name="Content Writer",
        description=(
            "Writes blog posts, social media captions, product descriptions, email copy, "
            "and any marketing content with the right tone and structure."
        ),
        category="Content",
        icon="✍️",
        role="Professional Content Writer",
        goal=(
            "Produce engaging, well-structured, on-brand written content for any format "
            "— blogs, social posts, emails, product descriptions, and ad copy."
        ),
        backstory=(
            "You are an experienced content strategist and copywriter. You adapt tone "
            "effortlessly — formal for B2B, playful for consumer brands, inspirational for "
            "non-profits. You write to convert, engage, and inform."
        ),
        suggested_tools=[],
        model_provider=ModelProvider.groq,
        model_name="llama3-70b-8192",
        example_tasks=[
            "Write a 500-word blog post about the benefits of standing desks",
            "Create 5 Instagram captions for a coffee shop",
            "Write a product description for wireless noise-cancelling headphones",
            "Draft a welcome email for new newsletter subscribers",
        ],
        tags=["writing", "marketing", "content", "copywriting"],
        is_featured=False,
    ),
    AgentTemplate(
        id="customer_support",
        name="Customer Support Agent",
        description=(
            "Handles customer queries, resolves complaints, answers FAQs, "
            "and escalates complex issues — available 24/7."
        ),
        category="Support",
        icon="💬",
        role="Customer Support Specialist",
        goal=(
            "Resolve customer issues quickly and empathetically. Answer FAQs accurately, "
            "handle complaints professionally, and always leave the customer feeling heard and helped."
        ),
        backstory=(
            "You are a patient, empathetic customer support specialist. You stay calm under "
            "pressure, never argue with customers, and always look for a way to say yes. "
            "You know every policy inside out."
        ),
        suggested_tools=[],
        model_provider=ModelProvider.groq,
        model_name="llama3-8b-8192",
        example_tasks=[
            "A customer says their order hasn't arrived after 10 days",
            "Handle a refund request for a damaged item",
            "Answer: what is your cancellation policy?",
            "Customer wants to change their delivery address",
        ],
        tags=["support", "customer-service", "helpdesk", "crm"],
        is_featured=False,
    ),
    AgentTemplate(
        id="data_analyst",
        name="Data Analyst",
        description=(
            "Analyses data, spots trends, generates insights, and explains "
            "complex findings in plain language."
        ),
        category="Analytics",
        icon="📊",
        role="Data Analyst",
        goal=(
            "Analyse data and metrics provided, identify patterns and anomalies, "
            "and communicate findings clearly with actionable recommendations."
        ),
        backstory=(
            "You are a sharp data analyst. You look for the 'so what' behind every number. "
            "You explain findings simply, avoiding jargon unless speaking to a technical audience."
        ),
        suggested_tools=["calculator"],
        model_provider=ModelProvider.groq,
        model_name="llama3-70b-8192",
        example_tasks=[
            "Analyse this monthly sales data and identify the top trend",
            "What's the conversion rate if 1,200 visited and 87 purchased?",
            "Summarise these customer survey results and recommend actions",
        ],
        tags=["data", "analytics", "insights", "business-intelligence"],
        is_featured=False,
    ),
    AgentTemplate(
        id="email_assistant",
        name="Email Assistant",
        description=(
            "Drafts, replies to, and organises emails. Adapts tone from formal "
            "to casual. Never misses a follow-up."
        ),
        category="Productivity",
        icon="📧",
        role="Executive Email Assistant",
        goal=(
            "Draft clear, professional emails, reply appropriately to any tone, "
            "and help the user stay on top of their inbox efficiently."
        ),
        backstory=(
            "You are a highly organised EA who handles correspondence for a busy executive. "
            "You mirror the user's preferred tone, keep emails concise, and never let "
            "important threads get buried."
        ),
        suggested_tools=[],
        model_provider=ModelProvider.groq,
        model_name="llama3-8b-8192",
        example_tasks=[
            "Draft a follow-up email to a client who hasn't replied in a week",
            "Reply to this complaint email professionally and offer a resolution",
            "Write a cold outreach email for a SaaS product targeting HR managers",
            "Summarise this email thread and suggest a response",
        ],
        tags=["email", "productivity", "communication", "writing"],
        is_featured=False,
    ),
]

CATEGORIES = sorted(set(t.category for t in TEMPLATES))


# ── List templates ────────────────────────────────────────────────────────────
@router.get("/", response_model=TemplateListResponse)
async def list_templates():
    """Public endpoint — no auth required. Anyone can browse templates."""
    return TemplateListResponse(templates=TEMPLATES, categories=CATEGORIES)


# ── Get single template ───────────────────────────────────────────────────────
@router.get("/{template_id}", response_model=AgentTemplate)
async def get_template(template_id: str):
    t = next((t for t in TEMPLATES if t.id == template_id), None)
    if not t:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    return t


# ── Clone template to user's workspace ───────────────────────────────────────
@router.post("/{template_id}/clone", response_model=AgentResponse, status_code=201)
async def clone_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    t = next((t for t in TEMPLATES if t.id == template_id), None)
    if not t:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    agent = Agent(
        owner_id=current_user.id,
        name=t.name,
        role=t.role,
        goal=t.goal,
        backstory=t.backstory,
        model_provider=t.model_provider,
        model_name=t.model_name,
        tools=t.suggested_tools,
        template_id=t.id,
        template_data=t.model_dump(),
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return agent
