from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI(title="Lead Management API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LeadCreate(BaseModel):
    name: str
    job_title: str
    phone_number: str
    company: str
    email: str
    headcount: str  
    industry: str
    
    
class Lead(LeadCreate):
    id: str
    enriched: bool = False
    enrichment_data: Optional[dict] = None

leads_db: dict[str, Lead] = {}

def seed_data():
    dummy_leads = [
        {
            "name": "John Doe",
            "job_title": "CEO",
            "phone_number": "+62812345678",
            "company": "Tech Startup",
            "email": "john@techstartup.com",
            "headcount": "11-50",
            "industry": "Technology"
        },
        {
            "name": "Jane Smith",
            "job_title": "Marketing Director",
            "phone_number": "+62887654321",
            "company": "Construction Co",
            "email": "jane@constructco.com",
            "headcount": "51-200",
            "industry": "Construction"
        },
        {
            "name": "Bob Wilson",
            "job_title": "CTO",
            "phone_number": "+62811112222",
            "company": "Logistics Plus",
            "email": "bob@logisticsplus.com",
            "headcount": "201-500",
            "industry": "Logistics"
        }
    ]
    for lead_data in dummy_leads:
        lead_id = str(uuid.uuid4())
        leads_db[lead_id] = Lead(id=lead_id, **lead_data)

seed_data()


@app.get("/")
def root():
    return {"message": "Lead Management API", "version": "1.0"}

@app.get("/leads")
def get_leads(
    industry: Optional[str] = Query(None, description="Filter by industry"),
    headcount: Optional[str] = Query(None, description="Filter by headcount")
):
    results = list(leads_db.values())
    
    if industry:
        results = [l for l in results if l.industry.lower() == industry.lower()]
    
    if headcount:
        results = [l for l in results if l.headcount == headcount]
    
    return {"leads": results, "total": len(results)}


@app.get("/leads/{lead_id}")
def get_lead(lead_id: str):
    if lead_id not in leads_db:
        return {"error": "Lead not found"}, 404
    return leads_db[lead_id]


@app.post("/leads")
def create_lead(lead: LeadCreate):
    lead_id = str(uuid.uuid4())
    new_lead = Lead(id=lead_id, **lead.model_dump())
    leads_db[lead_id] = new_lead
    return {"message": "Lead created", "lead": new_lead}

@app.post("/leads/{lead_id}/enrich")
def enrich_lead(lead_id: str):
    if lead_id not in leads_db:
        return {"error": "Lead not found"}, 404
    
    lead = leads_db[lead_id]
    
    lead.enriched = True
    lead.enrichment_data = {
        "linkedin_url": f"https://linkedin.com/in/{lead.name.lower().replace(' ', '-')}",
        "company_size_verified": True,
        "company_revenue": "$1M - $10M",
        "technologies_used": ["Python", "React", "AWS"],
        "recent_funding": "Series A - $5M",
        "decision_maker_score": 85
    }
    
    leads_db[lead_id] = lead
    return {"message": "Lead enriched", "lead": lead}

@app.get("/filters/options")
def get_filter_options():
    return {
        "industries": ["Technology", "Construction", "Logistics", "Healthcare", "Finance", "Manufacturing"],
        "headcounts": ["1-10", "11-50", "51-200", "201-500", "500+"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)