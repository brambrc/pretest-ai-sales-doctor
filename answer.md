# Part C - Engineering Lead Thinking

## 1. Architecture & Scaling

### How would you scale this system to: 1M+ leads?

**Database:**
- Obviously I would use proper database like postgres, implement proper indexing to column that most likely will frquently used by filter
- Seperating read and write traffic, by making read replicas and also connection pooling.
- Partitioning the table based on dates or region for faster query.
- Moving old data to cold storage, and also query optimization

**API:**
- Do load balancing to distribute traffic to multiple API instances.
- Caching using redis for data or response that frequently access
- Proper logging and tracing, also creating async processing for heaby task and implementing more job query for it.

**Multiple Enrichment Providers:**
- I will implementing Adapter Pattern interface, so it will be easy to swap or adding new provider (Apollo, ZoomInfo)
- Will adding several async provider / handle callback for webhook support
- I will also implement Retry Logic exponantially, incase there is timeout / error

**CRM Integrations:**
- Webhook for sync realtime ke Salesforce, HubSpot.
- Using message queue (RabbitMQ/SQS) for more realible data, incase error.

**Campaign Automation:**
- Ofc, make everything seperate. Monolith is key to disaster, make every service independently
- Gonna make event driven arch, trigger campaign based on lead action.
- template engine with variable substitution 

---

## 2. Team & Process

### First 90 days:

**Month 1:** 
- Digest existing codebase, architecture, and current tech debt
- Setup or improve CI/CD pipeline
- Pasang monitoring & logging (Sentry, Datadog)
- Establish coding standards & PR review process
- Installing monitoring and alerting metrics
- 1 on 1 with stakeholder to understand what is P0 and where is current priority to deliver at.

**Month 2:**
- Handle impactfull tech debt
- Improving test coverage and performance audit
- Documentation and hiring new engineer
- Knowledge sharing session

**Month 3:**
- Scalling infra based on growth
- Review & optimize cloud cost
- Hiring and onboarding
- Create proper road map for next quarter / semester

### Who to hire first ? (as solo engineer):

1. Hire Senior Backend and Frontend Engineer, or maybe fullstack engineer, because they gonna develop the core product.
2. Then devops engineer, it can wait or can be handle by backend or lead engineer, but when you try to scale, I think its a must to have 1 person dedicated for infrastructure

### Dev Process:

- Every PR need to be approve and review at least by 1 peer/lead/senior/junior before merging
- Automated Provider / Dependency and Test must passed before merging
- Feature flag for staged rollback
- At least deploy it on staging environment first before deploying it to production, to test either the udpate works or not.

---

## 3. Tradeoffs

### Shortcut I took due to time:

1. Build vs Buy, Enrichment Early stage better to use existing providers (Clearbit, Apollo, ZoomInfo), build our own later when profitable and need customization
2. Speed vs Quality, ship fast with feature flags, iterate based on user feedback. But critical paths (payment, data integrity, security) must be solid from day one

3. Cost vs Performance, measure first, optimize later - avoid premature optimization. But always design with scalability in mind from the beginning
