import type { RiskDiagnosisType, RiskDimensionKey } from "@/lib/juken/types";

export type CnResultTemplate = {
  title: string;
  tendency: string;
  topRiskTips: Partial<Record<RiskDimensionKey, string>>;
};

export const CN_DIMENSION_LABELS: Record<RiskDimensionKey, string> = {
  homework_load: "作业负荷",
  review_retention: "复习与定着不足",
  planning: "计划与优先级混乱",
  parent_involvement: "家长介入过多",
  autonomy: "自主整理能力不足",
  mental_load: "精神负荷",
};

export const CN_RESULT_TEMPLATES: Record<RiskDiagnosisType, CnResultTemplate> = {
  安定運用型: {
    title:
      "目前整体节奏还算稳定。但中学受験的家庭学习很容易在考试前、作业量增加时变乱，建议定期确认复习和订正有没有被压后。",
    tendency:
      "现在没有明显失控的迹象。接下来更重要的是：复习、订正和考试前节奏有没有被“赶作业”挤到后面。",
    topRiskTips: {
      review_retention: "容易出现“做了但不牢”的情况，建议把订正与复习留出固定位置。",
      planning: "一旦任务变多，优先级容易乱，建议每周固定一次做取舍。",
    },
  },
  負荷過多型: {
    title:
      "现在最明显的是：作业量和疲惫感同时偏高。如果继续只追完成量，复习、订正和理解整理会越来越难跟上。",
    tendency:
      "每天都很忙，但真正重要的复习和订正常常会被压后。先把“这周必须做什么/可以先放什么”分出来，会比硬扛更有效。",
    topRiskTips: {
      homework_load: "作业量可能已经接近上限，先做取舍比硬扛更有效。",
      mental_load: "家庭氛围紧张与疲惫感上来时，最先要做的是降低摩擦与压力源。",
    },
  },
  不安定型: {
    title:
      "现在不是单一问题。作业、复习、计划或家长介入中，可能有几个环节同时在摇晃。这时先整理顺序，比继续增加任务更重要。",
    tendency:
      "看起来每天都在学，但有些东西总会被挤到后面。越到考试前、作业一重，就越容易一口气乱起来。",
    topRiskTips: {
      planning: "计划容易几天就乱，建议先把每天“起步流程”固定下来。",
      review_retention: "复习被挤掉会快速累积失分，先把订正回到日常流程里。",
    },
  },
  親主導型: {
    title:
      "目前学习很容易依赖家长推动。家长一停，学习就慢下来。短期能撑住，但长期会让家长越来越累，孩子也更难自己整理学习。",
    tendency:
      "家长提醒的次数变多时，往往不是孩子“故意不学”，而是不知道下一步先做什么。先把“下一步”变清楚，才会慢慢松下来。",
    topRiskTips: {
      parent_involvement: "家长提醒次数越多，越容易变成“离开就停”。先把“下一步做什么”写出来。",
      autonomy: "孩子不太会自己整理下一步时，先从“每天一个小决策”开始练。",
    },
  },
  表面努力型: {
    title:
      "看起来每天都在完成作业，但复习、订正和理解整理没有真正跟上。这类状态最容易出现：平时很忙，考试还是反复错。",
    tendency:
      "作业“做完”不等于“弄懂”。如果错题回收和复习回转没跟上，就会出现同类题反复错、越做越没底的感觉。",
    topRiskTips: {
      review_retention: "同类题反复错时，多半不是不会，而是“订正没回收”。",
      homework_load: "如果只剩时间赶作业，订正就会自然消失，需要先留出订正位。",
    },
  },
  計画不明型: {
    title:
      "现在最需要整理的是学习顺序。不是所有任务都要同等用力。先做什么、暂时放什么，比继续堆任务更关键。",
    tendency:
      "每天都在做事，但真正该先处理的内容容易被拖到后面。把“今天必须做的”和“可以先减少的”分开，会更快回到正轨。",
    topRiskTips: {
      planning: "先确定“今天最重要的一件事”，再决定哪些可以延后。",
      homework_load: "当作业挤压一切时，优先级不做取舍就一定会乱。",
    },
  },
  要観察型: {
    title:
      "目前还没有明显失控，但已经有一些地方开始不稳定。建议先观察复习、错题和考试前节奏，避免后面一起乱起来。",
    tendency:
      "现在更像是“局部开始吃紧”。早点把最容易卡住的环节找出来做微调，会比等到考试前再补更轻松。",
    topRiskTips: {
      planning: "先把容易乱的环节找出来（时间段/科目/作业类型），再做微调。",
      mental_load: "紧张感一上来，学习质量会先掉，先把冲突点降下来。",
    },
  },
};
